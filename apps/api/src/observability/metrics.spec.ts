import { describe, expect, it } from "vitest";
import { MetricsService } from "./metrics.service";
import { QueueService } from "../queue/queue.service";

const fakeQueueService = {
  getCounts: async () => ({ waiting: 3, active: 1, delayed: 0, failed: 2, completed: 10 }),
} as unknown as QueueService;

function makeMetrics() {
  return new MetricsService(fakeQueueService);
}

describe("metrics (§67)", () => {
  it("exposes a text-format Prometheus scrape without PII", async () => {
    const m = makeMetrics();
    m.recordHttp("GET", "/api/v1/products", 200, 12.3);
    m.recordHttp("GET", "/api/v1/products/:id", 500, 50);
    m.recordCheckoutStarted();
    m.recordOrderCreated();
    m.recordProductsSold(4);
    m.recordPackOpening();
    const out = await m.metrics();
    expect(out).toContain("http_requests_total");
    expect(out).toContain('method="GET"');
    expect(out).toContain('status="500"');
    expect(out).toContain("checkout_started_total");
    expect(out).toContain("orders_created_total");
    expect(out).toContain("products_sold_total");
    expect(out).toContain("pack_openings_total");
    // no user identifiers / emails / PII
    expect(out).not.toContain("user_id");
    expect(out).not.toContain("@");
  });

  it("records all required business metrics", async () => {
    const m = makeMetrics();
    m.recordCheckoutStarted(); m.recordCheckoutCompleted(); m.recordCheckoutFailed();
    m.recordPaymentStarted(); m.recordPaymentCompleted(); m.recordPaymentFailed();
    m.recordInventoryReservation(); m.recordInventoryReservationFailed();
    m.recordOrderCreated(); m.recordOrderCompleted();
    m.recordProductsSold(2); m.recordPackOpening(); m.recordCardAdded(); m.recordRewardRedeemed();
    const out = await m.metrics();
    for (const name of [
      "checkout_started_total", "checkout_completed_total", "checkout_failed_total",
      "payment_started_total", "payment_completed_total", "payment_failed_total",
      "inventory_reservations_total", "inventory_reservations_failed_total",
      "orders_created_total", "orders_completed_total", "products_sold_total",
      "pack_openings_total", "cards_added_total", "rewards_redeemed_total",
      "queue_depth", "queue_job_failures_total",
      "db_query_duration_seconds", "redis_command_duration_seconds",
      "http_errors_total",
    ]) {
      expect(out).toContain(name);
    }
  });

  it("pollQueues records queue depth + failed delta without leaking data", async () => {
    const m = makeMetrics();
    await m.pollQueues();
    const out = await m.metrics();
    expect(out).toContain('queue_depth{queue="email",state="waiting"} 3');
    expect(out).toContain('queue_depth{queue="email",state="failed"} 2');
    expect(out).not.toContain("email@");
  });
});
