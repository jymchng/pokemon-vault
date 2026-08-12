/**
 * Payment provider abstraction (§24).
 *
 * The ecommerce core depends ONLY on this interface — never on Stripe directly.
 * New providers (Adyen, etc.) implement this contract and are selected via
 * PAYMENT_PROVIDER env. Card numbers / CVVs are NEVER accepted or stored.
 */

export interface CreatePaymentIntentInput {
  amount: number; // major units (USD)
  currency: string;
  idempotencyKey: string;
  orderNumber: string;
}

export interface PaymentIntentResult {
  provider: string;
  providerRef: string; // provider-side intent/charge id
  clientSecret?: string | null; // for client-side confirmation (Stripe)
  status: "PENDING" | "SUCCEEDED" | "FAILED";
}

export interface ConfirmPaymentInput {
  providerRef: string;
  amount: number;
  currency: string;
}

export interface RefundPaymentInput {
  providerRef: string;
  amount?: number; // partial when provided
  currency: string;
}

export interface WebhookEventInput {
  providerEventId: string;
  type: string;
  payload: Record<string, unknown>;
}

export interface WebhookEventResult {
  handled: boolean;
  providerRef?: string | null;
  status?: "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentIntentResult>;
  confirmPayment(input: ConfirmPaymentInput): Promise<PaymentIntentResult>;
  refundPayment(input: RefundPaymentInput): Promise<{ ok: boolean; providerRef?: string }>;
  handleWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>): Promise<WebhookEventInput | null>;
}
