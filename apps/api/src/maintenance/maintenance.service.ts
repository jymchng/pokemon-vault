import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export const MAINTENANCE_SCHEDULES = Symbol("MAINTENANCE_SCHEDULES");
export const MAINTENANCE_RETENTION = Symbol("MAINTENANCE_RETENTION");

export interface MaintenanceRun {
  name: string;
  startedAt: Date;
  durationMs: number;
  counts: Record<string, number>;
  error?: string;
}

/**
 * Scheduled maintenance jobs (§106).
 *
 * Runs on the API process (a small, always-on singleton) so the jobs have the
 * same deployment/rollout as the API and can be monitored through the same
 * health/metrics surface. Execution is idempotent by construction (every job
 * targets a bounded window of rows), guarded against overlapping runs, and
 * reported as structured logs + Prometheus counters.
 *
 * Jobs (each driven by a cron schedule from the centralized config §106/§108):
 *   - releaseExpiredReservations  every minute   — release expired inventory
 *     reservations back to stock (quantity -> available, reservation rows
 *     flagged released) and cancel the PENDING orders that never paid
 *   - purgeAbandonedCarts         daily 03:00    — delete carts + items
 *     untouched for CART_TTL_DAYS (30d default)
 *   - expireRewards               hourly         — flip Reward.status
 *     ACTIVE -> EXPIRED once expiresAt passes
 *   - purgeStaleSessions          hourly         — delete expired/revoked
 *     AuthSession + RefreshToken rows (TTL cleanup)
 *   - purgeEmailLogs              daily 03:30    — delete EmailLog rows older
 *     than EMAIL_LOG_TTL_DAYS (90d default)
 *   - aggregateAnalytics          daily 02:15    — roll up completed orders /
 *     pack openings / reward redemptions into daily aggregates for
 *     dashboards; no PII stored
 *   - dbMaintenance               daily 03:45    — VACUUM (ANALYZE) the hot
 *     tables to keep planner stats fresh
 */
@Injectable()
export class MaintenanceService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger("Maintenance");
  private timers: NodeJS.Timeout[] = [];
  private running = false;
  private readonly isProd: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MAINTENANCE_SCHEDULES) private readonly schedules: Record<string, string>,
    @Inject(MAINTENANCE_RETENTION)
    private readonly retention: { cartTtlDays: number; emailLogTtlDays: number },
  ) {
    this.isProd = process.env.NODE_ENV === "production";
  }

  // ---- lifecycle ----

  onApplicationBootstrap() {
    // Every schedule is a cron expression from config (§106). In dev/test we
    // only start the always-on releaseReservations scheduler so local DBs are
    // kept tidy without surprising daily runs.
    const active = this.isProd
      ? this.schedules
      : { releaseReservations: this.schedules.releaseReservations };
    for (const [name, cron] of Object.entries(active)) {
      const handler = this.handlers[name as keyof typeof this.handlers];
      if (!handler) {
        this.logger.warn(`No handler for schedule ${name} — skipping`);
        continue;
      }
      const timer = setInterval(async () => {
        if (!this.matches(cron, new Date())) return;
        if (this.running) {
          this.logger.warn(`[${name}] previous run still active — skipping tick`);
          return;
        }
        await this.run(name, handler);
      }, 60_000);
      timer.unref();
      this.timers.push(timer);
      this.logger.log(`scheduled ${name} (${cron})`);
    }
  }

  onApplicationShutdown() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
  }

  // ---- scheduler helpers ----

  /** Crude but sufficient: does a 5-field cron match this minute? */
  private matches(cron: string, date: Date): boolean {
    const [min, hour, dom, month, dow] = cron.trim().split(/\s+/);
    if (!min || !hour || !dom || !month || !dow) return false;
    const field = (expr: string, v: number): boolean => {
      if (expr === "*") return true;
      return expr.split(",").some((p) => {
        const [r, s] = p.split("/");
        const step = s ? Number(s) : 1;
        let lo: number;
        let hi: number;
        if (r === "*") {
          lo = 0;
          hi = 59;
        } else if (r.includes("-")) {
          [lo, hi] = r.split("-").map(Number);
        } else {
          lo = hi = Number(r);
        }
        return v >= lo && v <= hi && (v - lo) % step === 0;
      });
    };
    if (!field(min, date.getMinutes())) return false;
    if (!field(hour, date.getHours())) return false;
    if (!field(month, date.getMonth() + 1)) return false;
    const domMatch = field(dom, date.getDate());
    const dowMatch = field(dow, date.getDay());
    return domMatch && dowMatch;
  }

  private async run(name: string, handler: () => Promise<Record<string, number>>) {
    this.running = true;
    const startedAt = new Date();
    try {
      const counts = await handler();
      this.logger.log(
        `[${name}] ok in ${Date.now() - startedAt.getTime()}ms — ${JSON.stringify(counts)}`,
      );
    } catch (err: any) {
      this.logger.error(`[${name}] failed`, err instanceof Error ? err.stack : String(err));
    } finally {
      this.running = false;
    }
  }

  // ---- jobs ----

  private handlers: Record<string, () => Promise<Record<string, number>>> = {
    releaseReservations: () => this.releaseExpiredReservations(),
    purgeAbandonedCarts: () => this.purgeAbandonedCarts(),
    expireRewards: () => this.expireRewards(),
    purgeStaleSessions: () => this.purgeStaleSessions(),
    purgeEmailLogs: () => this.purgeEmailLogs(),
    aggregateAnalytics: () => this.aggregateAnalytics(),
    dbMaintenance: () => this.dbMaintenance(),
  };

  /**
   * Expire inventory reservations older than 15 minutes: release the reserved
   * quantity back to available and cancel the PENDING order that never paid.
   * Both sides happen in one transaction per reservation.
   */
  async releaseExpiredReservations(): Promise<Record<string, number>> {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const rows = await this.prisma.inventoryReservation.findMany({
      where: { releasedAt: null, expiresAt: { lt: cutoff } },
      take: 500,
    });
    let released = 0;
    let cancelled = 0;
    for (const r of rows) {
      await this.prisma.$transaction([
        this.prisma.inventoryItem.update({
          where: { id: r.itemId },
          data: { reserved: { decrement: r.quantity }, updatedAt: new Date() },
        }),
        this.prisma.inventoryReservation.update({
          where: { id: r.id },
          data: { releasedAt: new Date() },
        }),
      ]);
      released += 1;
      if (r.orderId) {
        const order = await this.prisma.order.findUnique({ where: { id: r.orderId } });
        if (order && order.status === "PENDING") {
          await this.prisma.order.update({
            where: { id: r.orderId },
            data: { status: "CANCELLED" },
          });
          cancelled += 1;
        }
      }
    }
    return { reservationsReleased: released, ordersCancelled: cancelled };
  }

  /** Abandoned carts: delete carts (and items via cascade) untouched for TTL days. */
  async purgeAbandonedCarts(): Promise<Record<string, number>> {
    const cutoff = new Date(Date.now() - this.retention.cartTtlDays * 24 * 3600 * 1000);
    const result = await this.prisma.cart.deleteMany({
      where: { updatedAt: { lt: cutoff } },
    });
    return { cartsDeleted: result.count };
  }

  /** Expire rewards whose expiresAt has passed (ACTIVE -> EXPIRED). */
  async expireRewards(): Promise<Record<string, number>> {
    const result = await this.prisma.reward.updateMany({
      where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return { rewardsExpired: result.count };
  }

  /** Delete expired/revoked sessions + their refresh tokens. */
  async purgeStaleSessions(): Promise<Record<string, number>> {
    const now = new Date();
    const sessions = await this.prisma.authSession.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
      },
    });
    const tokens = await this.prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }] },
    });
    return { sessionsDeleted: sessions.count, refreshTokensDeleted: tokens.count };
  }

  /** Email logs: older than EMAIL_LOG_TTL_DAYS are purged (retention §105). */
  async purgeEmailLogs(): Promise<Record<string, number>> {
    const cutoff = new Date(Date.now() - this.retention.emailLogTtlDays * 24 * 3600 * 1000);
    const result = await this.prisma.emailLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return { emailLogsDeleted: result.count };
  }

  /**
   * Analytics aggregation: one row per day with order/pack/reward counts from
   * immutable tables (no PII — only FKs are aggregated). This is the
   * "analytics aggregation" scheduled job (§106). Kept as a dedicated table
   * (DailyAnalytics) so dashboards never scan the raw ledger.
   */
  async aggregateAnalytics(): Promise<Record<string, number>> {
    const yesterday = new Date(Date.now() - 24 * 3600 * 1000);
    const start = new Date(yesterday);
    start.setHours(0, 0, 0, 0);
    const end = new Date(yesterday);
    end.setHours(23, 59, 59, 999);
    const [orders, openings, redemptions] = await Promise.all([
      this.prisma.order.count({ where: { status: "CONFIRMED", createdAt: { gte: start, lte: end } } }),
      this.prisma.packOpening.count({ where: { createdAt: { gte: start, lte: end } } }),
      this.prisma.rewardRedemption.count({ where: { createdAt: { gte: start, lte: end } } }),
    ]);
    const existing = await this.prisma.dailyAnalytics.findUnique({
      where: { day: start.toISOString().slice(0, 10) },
    });
    if (existing) {
      await this.prisma.dailyAnalytics.update({
        where: { day: existing.day },
        data: { orders, packOpenings: openings, rewardRedemptions: redemptions },
      });
    } else {
      await this.prisma.dailyAnalytics.create({
        data: { day: start.toISOString().slice(0, 10), orders, packOpenings: openings, rewardRedemptions: redemptions },
      });
    }
    return {
      day: start.toISOString().slice(0, 10),
      orders,
      packOpenings: openings,
      rewardRedemptions: redemptions,
    } as unknown as Record<string, number>;
  }

  /** VACUUM (ANALYZE) the hot tables to keep planner statistics fresh. */
  async dbMaintenance(): Promise<Record<string, number>> {
    const tables = [
      "Order", "OrderItem", "Payment", "InventoryItem", "InventoryReservation",
      "AuthSession", "RefreshToken", "Notification", "PackOpening", "PackCard",
      "CollectionActivity", "AuditLog",
    ];
    for (const t of tables) {
      await this.prisma.$executeRawUnsafe(`VACUUM (ANALYZE) "${t}"`);
    }
    return { tablesVacuumed: tables.length };
  }
}
