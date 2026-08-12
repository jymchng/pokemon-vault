import { createHmac, timingSafeEqual } from "node:crypto";
import {
  ConfirmPaymentInput,
  CreatePaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  RefundPaymentInput,
  WebhookEventInput,
} from "../payment-provider.interface";

/**
 * Stripe provider — implemented WITHOUT the stripe SDK (dependency-free):
 * - createPaymentIntent: deterministic provider ref from the idempotency key.
 * - confirmPayment / refundPayment: local-state abstraction (in production
 *   these would call the Stripe API with the same contract).
 * - handleWebhook: real Stripe signature verification (HMAC-SHA256 over
 *   `<timestamp>.<payload>` with the webhook secret, timing-safe compare),
 *   returns the parsed event with its unique id + type + payload.
 *
 * Card numbers / CVVs are never accepted or stored anywhere.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly name = "stripe";

  constructor(private readonly webhookSecret: string) {}

  private ref(seed: string): string {
    return `pi_${createHmac("sha256", this.webhookSecret).update(seed).digest("hex").slice(0, 24)}`;
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    const providerRef = this.ref(`intent:${input.idempotencyKey}`);
    return {
      provider: this.name,
      providerRef,
      clientSecret: `cs_test_${providerRef.slice(3)}`,
      status: "PENDING",
    };
  }

  async confirmPayment(input: ConfirmPaymentInput): Promise<PaymentIntentResult> {
    return {
      provider: this.name,
      providerRef: input.providerRef,
      status: "SUCCEEDED",
    };
  }

  async refundPayment(input: RefundPaymentInput): Promise<{ ok: boolean; providerRef?: string }> {
    return { ok: true, providerRef: `re_${this.ref(`refund:${input.providerRef}`).slice(3)}` };
  }

  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEventInput | null> {
    const sigHeader = headers["stripe-signature"];
    const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    if (!signature) return null;

    const parts = Object.fromEntries(
      signature.split(",").map((p) => {
        const [k, v] = p.trim().split("=");
        return [k, v ?? ""];
      }),
    );
    const timestamp = parts["t"];
    const sig = parts["v1"];
    if (!timestamp || !sig) return null;

    const signed = `${timestamp}.${rawBody}`;
    const expected = createHmac("sha256", this.webhookSecret).update(signed, "utf8").digest("hex");
    const actual = Buffer.from(sig, "hex");
    const want = Buffer.from(expected, "hex");
    if (actual.length !== want.length || !timingSafeEqual(actual, want)) {
      throw new Error("INVALID_WEBHOOK_SIGNATURE");
    }

    // Reject stale events (tolerance window) — out-of-order / replay guard.
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - Number(timestamp)) > 300) {
      throw new Error("WEBHOOK_TOO_OLD");
    }

    try {
      const payload = JSON.parse(rawBody) as Record<string, unknown>;
      const eventId = (payload.id as string) ?? `evt_${timestamp}_${sig.slice(0, 8)}`;
      const type = (payload.type as string) ?? "unknown";
      return { providerEventId: eventId, type, payload };
    } catch {
      return null;
    }
  }
}
