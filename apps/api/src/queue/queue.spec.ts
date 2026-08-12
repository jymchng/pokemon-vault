import { QUEUES, DEFAULT_JOB_OPTS } from "./queue.constants";
import * as fs from "node:fs";
import * as path from "node:path";

describe("G23 queue registry (§45)", () => {
  it("defines all nine domain queues", () => {
    expect(QUEUES).toEqual([
      "email",
      "notifications",
      "order-processing",
      "inventory",
      "shipping",
      "rewards",
      "search-indexing",
      "image-processing",
      "analytics",
    ]);
  });

  it("default job opts use retries with exponential backoff", () => {
    expect(DEFAULT_JOB_OPTS.attempts).toBeGreaterThan(1);
    expect(DEFAULT_JOB_OPTS.backoff.type).toBe("exponential");
    expect(DEFAULT_JOB_OPTS.backoff.delay).toBeGreaterThan(0);
  });
});

describe("G23 email templates (§44)", () => {
  it("queueable email builders exist for all required templates", () => {
    const src = fs.readFileSync(path.join(__dirname, "../email/email.service.ts"), "utf8");
    for (const t of ["Welcome", "VerifyEmail", "PasswordReset", "OrderConfirmation", "ShippingUpdate", "DeliveryConfirmation", "RewardUnlocked"]) {
      expect(src).toContain(`send${t}`);
    }
    // Emails must be queued, never sent synchronously.
    expect(src).toMatch(/queue\.enqueue\("email"/);
  });
});
