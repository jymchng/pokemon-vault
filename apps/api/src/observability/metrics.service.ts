import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";
import { QUEUES, QueueName } from "../queue/queue.constants";
import { QueueService } from "../queue/queue.service";

/**
 * Prometheus metrics (§67) — never carries sensitive user data: labels are
 * HTTP method/route/status, queue names, and operation names only.
 *
 *   HTTP        http_requests_total, http_request_duration_seconds, http_errors_total
 *   DB          db_query_duration_seconds
 *   Redis       redis_command_duration_seconds
 *   Queues      queue_depth (waiting/active/delayed/failed gauges + failed delta counter)
 *   Domain      checkout_*, payment_*, inventory_reservation_*, pack_openings_total
 *   Business    orders_created_total, orders_completed_total, products_sold_total,
 *               pack_openings_total, cards_added_total, rewards_redeemed_total
 */
@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly registry = new Registry();
  private readonly timers: { stop: () => void } | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private prevFailed = new Map<string, number>();

  // ── HTTP ────────────────────────────────────────────────────────────────
  private readonly httpRequests = new Counter({
    name: "http_requests_total",
    help: "Total HTTP requests",
    labelNames: ["method", "route", "status"],
    registers: [this.registry],
  });
  private readonly httpDuration = new Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });
  private readonly httpErrors = new Counter({
    name: "http_errors_total",
    help: "HTTP 5xx responses (server errors)",
    labelNames: ["method", "route"],
    registers: [this.registry],
  });

  // ── DB / Redis ──────────────────────────────────────────────────────────
  private readonly dbDuration = new Histogram({
    name: "db_query_duration_seconds",
    help: "Database query duration in seconds",
    labelNames: ["operation"],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });
  private readonly redisDuration = new Histogram({
    name: "redis_command_duration_seconds",
    help: "Redis command duration in seconds",
    labelNames: ["command"],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [this.registry],
  });

  // ── Queues ───────────────────────────────────────────────────────────────
  private readonly queueDepth = new Gauge({
    name: "queue_depth",
    help: "Number of jobs in a queue state",
    labelNames: ["queue", "state"],
    registers: [this.registry],
  });
  private readonly queueJobFailures = new Counter({
    name: "queue_job_failures_total",
    help: "Total job failures observed per queue (delta of failed count)",
    labelNames: ["queue"],
    registers: [this.registry],
  });

  // ── Domain / business metrics ─────────────────────────────────────────────
  private readonly checkoutStarted = this.counter("checkout_started_total", "Checkouts started");
  private readonly checkoutCompleted = this.counter("checkout_completed_total", "Checkouts completed (payment ok)");
  private readonly checkoutFailed = this.counter("checkout_failed_total", "Checkouts failed");
  private readonly paymentStarted = this.counter("payment_started_total", "Payment attempts started");
  private readonly paymentCompleted = this.counter("payment_completed_total", "Payments completed");
  private readonly paymentFailed = this.counter("payment_failed_total", "Payments failed");
  private readonly inventoryReserved = this.counter("inventory_reservations_total", "Inventory reservations created");
  private readonly inventoryReservationFailed = this.counter("inventory_reservations_failed_total", "Inventory reservations failed");
  private readonly ordersCreated = this.counter("orders_created_total", "Orders created");
  private readonly ordersCompleted = this.counter("orders_completed_total", "Orders completed");
  private readonly productsSold = this.counter("products_sold_total", "Product units sold");
  private readonly packOpenings = this.counter("pack_openings_total", "Pack openings");
  private readonly cardsAdded = this.counter("cards_added_total", "Collection cards added");
  private readonly rewardsRedeemed = this.counter("rewards_redeemed_total", "Rewards redeemed");

  constructor(private readonly queueService: QueueService) {}

  private counter(name: string, help: string): Counter<string> {
    return new Counter({ name, help, registers: [this.registry] });
  }

  onModuleInit() {
    collectDefaultMetrics({ register: this.registry, prefix: "node_" });
    // Poll queue depths + failed deltas every 30s.
    this.pollTimer = setInterval(() => void this.pollQueues(), 30_000);
    this.pollTimer.unref();
  }

  onModuleDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  /** Prometheus text exposition (controller serves this). */
  async metrics(): Promise<string> {
    return this.registry.metrics();
  }

  // ── HTTP ──────────────────────────────────────────────────────────────────
  recordHttp(method: string, route: string, status: number, durationMs: number): void {
    this.httpRequests.inc({ method, route, status });
    this.httpDuration.observe({ method, route, status }, durationMs / 1000);
    if (status >= 500) this.httpErrors.inc({ method, route });
  }

  // ── DB / Redis ────────────────────────────────────────────────────────────
  recordDb(operation: string, durationMs: number): void {
    this.dbDuration.observe({ operation }, durationMs / 1000);
  }

  recordRedis(command: string, durationMs: number): void {
    this.redisDuration.observe({ command }, durationMs / 1000);
  }

  // ── Queues ────────────────────────────────────────────────────────────────
  async pollQueues(): Promise<void> {
    for (const name of QUEUES) {
      try {
        const counts = await this.queueService.getCounts(name);
        for (const state of ["waiting", "active", "delayed", "failed", "completed"] as const) {
          const n = counts[state] ?? 0;
          this.queueDepth.set({ queue: name, state }, n);
        }
        // failed delta → failure counter (jobs failing between polls).
        const failed = counts.failed ?? 0;
        const key = `${name}`;
        const prev = this.prevFailed.get(key) ?? 0;
        if (failed > prev) this.queueJobFailures.inc({ queue: name }, failed - prev);
        this.prevFailed.set(key, failed);
      } catch {
        // transient queue errors must not break scraping
      }
    }
  }

  // ── Domain / business helpers (§67) ───────────────────────────────────────
  recordCheckoutStarted() { this.checkoutStarted.inc(); }
  recordCheckoutCompleted() { this.checkoutCompleted.inc(); }
  recordCheckoutFailed() { this.checkoutFailed.inc(); }
  recordPaymentStarted() { this.paymentStarted.inc(); }
  recordPaymentCompleted() { this.paymentCompleted.inc(); }
  recordPaymentFailed() { this.paymentFailed.inc(); }
  recordInventoryReservation() { this.inventoryReserved.inc(); }
  recordInventoryReservationFailed() { this.inventoryReservationFailed.inc(); }
  recordOrderCreated() { this.ordersCreated.inc(); }
  recordOrderCompleted() { this.ordersCompleted.inc(); }
  recordProductsSold(n: number) { this.productsSold.inc(n); }
  recordPackOpening() { this.packOpenings.inc(); }
  recordCardAdded() { this.cardsAdded.inc(); }
  recordRewardRedeemed() { this.rewardsRedeemed.inc(); }
}
