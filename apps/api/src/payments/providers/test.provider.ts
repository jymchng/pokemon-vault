import {
  ConfirmPaymentInput,
  CreatePaymentIntentInput,
  PaymentIntentResult,
  PaymentProvider,
  RefundPaymentInput,
  WebhookEventInput,
} from "../payment-provider.interface";

/**
 * Deterministic in-process provider for local development / tests (no external
 * service). Mirrors the real provider contract; webhooks are accepted only
 * when the body is valid JSON and carries an id + type (no signature required).
 */
export class TestPaymentProvider implements PaymentProvider {
  readonly name = "test";

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult> {
    return {
      provider: this.name,
      providerRef: `pi_test_${input.idempotencyKey.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24)}`,
      clientSecret: `cs_test_${input.idempotencyKey.slice(0, 16)}`,
      status: "PENDING",
    };
  }

  async confirmPayment(input: ConfirmPaymentInput): Promise<PaymentIntentResult> {
    return { provider: this.name, providerRef: input.providerRef, status: "SUCCEEDED" };
  }

  async refundPayment(input: RefundPaymentInput): Promise<{ ok: boolean; providerRef?: string }> {
    return { ok: true, providerRef: `re_test_${input.providerRef.slice(-16)}` };
  }

  async handleWebhook(
    rawBody: string,
    _headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEventInput | null> {
    try {
      const payload = JSON.parse(rawBody) as Record<string, unknown>;
      if (!payload.id || !payload.type) return null;
      return { providerEventId: String(payload.id), type: String(payload.type), payload };
    } catch {
      return null;
    }
  }
}
