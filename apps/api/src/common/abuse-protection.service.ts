import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export interface AbuseRule {
  /** e.g. "login", "checkout", "payment", "reward-redemption" */
  scope: string;
  /** key identifying the actor: userId or ip */
  actorKey: string;
  /** max allowed events in the window */
  limit: number;
  /** window in seconds */
  windowSeconds: number;
}

/**
 * Abuse protection (§90): simple sliding-window counters over Redis-like
 * semantics backed by the database. Guards login/checkout/payment/reward
 * abuse with extension points — add a rule without changing this service.
 * In production this should move to Redis (SETEX+INCR) for atomicity; the
 * repository here is intentionally small and swappable.
 */
@Injectable()
export class AbuseProtectionService {
  constructor(private readonly prisma: PrismaService) {}

  /** Count recent events for the actor in the window. */
  async count(scope: string, actorKey: string, windowSeconds: number): Promise<number> {
    const since = new Date(Date.now() - windowSeconds * 1000);
    return this.prisma.abuseEvent.count({
      where: { scope, actorKey, createdAt: { gte: since } },
    });
  }

  /** Record one event. */
  async record(scope: string, actorKey: string, meta?: Record<string, unknown>): Promise<void> {
    await this.prisma.abuseEvent.create({
      data: { scope, actorKey, meta: (meta ?? {}) as any },
    });
  }

  /**
   * Check a rule: returns true when the actor has exceeded the limit
   * (abuse detected — the caller decides 429/block). Records the event
   * when within limits.
   */
  async checkAndRecord(rule: AbuseRule): Promise<boolean> {
    const n = await this.count(rule.scope, rule.actorKey, rule.windowSeconds);
    if (n >= rule.limit) return true; // exceeded — do not record (block)
    await this.record(rule.scope, rule.actorKey);
    return false;
  }
}
