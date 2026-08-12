import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PaymentProvider } from "./payment-provider.interface";
import { PAYMENT_PROVIDER } from "./payment-provider.token";
import { PaymentsRepository } from "./payments.repository";

/**
 * Payment orchestration (§24-25):
 * - createPaymentIntent: idempotent (same idempotencyKey → same payment row).
 * - handleWebhook: signature-verified (per provider), recorded with unique
 *   providerEventId (replay → no-op), idempotent state transitions, safe
 *   retry (unprocessed events can be reprocessed), out-of-order tolerance
 *   (we only move PENDING → SUCCEEDED; a late "succeeded" after "refunded"
 *   is ignored).
 * - Card numbers / CVVs are never stored.
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async createIntent(orderId: string, amount: number, currency = "USD") {
    // Idempotency: one payment per order (orderId @unique) and per idempotencyKey.
    const existing = await this.repo.findByOrderId(orderId);
    if (existing) return existing;
    const idempotencyKey = `chk_${orderId}`;
    const result = await this.provider.createPaymentIntent({
      amount,
      currency,
      idempotencyKey,
      orderNumber: orderId,
    });
    await this.repo.createPayment({
      orderId,
      provider: this.provider.name,
      providerRef: result.providerRef,
      amount,
      currency,
      status: "PENDING",
      idempotencyKey,
    });
    return (await this.repo.findByOrderId(orderId))!;
  }

  async confirm(orderId: string) {
    const payment = await this.repo.findByOrderId(orderId);
    if (!payment) throw new NotFoundException("Payment not found");
    if (!payment.providerRef) throw new BadRequestException("No provider reference");
    const result = await this.provider.confirmPayment({
      providerRef: payment.providerRef,
      amount: payment.amount,
      currency: payment.currency,
    });
    return this.repo.updateStatus(payment.id, result.status, payment.providerRef);
  }

  async getPayment(orderId: string) {
    const payment = await this.repo.findByOrderId(orderId);
    if (!payment) throw new NotFoundException("Payment not found");
    return payment;
  }

  async refund(orderId: string, amount?: number) {
    const payment = await this.repo.findByOrderId(orderId);
    if (!payment) throw new NotFoundException("Payment not found");
    if (!payment.providerRef) throw new BadRequestException("No provider reference");
    await this.provider.refundPayment({
      providerRef: payment.providerRef,
      amount,
      currency: payment.currency,
    });
    return this.repo.updateStatus(payment.id, "REFUNDED", payment.providerRef);
  }

  /**
   * Webhook entry point. Returns { replayed } so the controller can respond 200
   * for replays (safe retry) and 202/200 for new events.
   */
  async handleWebhook(rawBody: string, headers: Record<string, string | string[] | undefined>) {
    let event: { providerEventId: string; type: string; payload: Record<string, unknown> } | null;
    try {
      event = await this.provider.handleWebhook(rawBody, headers);
    } catch (err: any) {
      if (err instanceof Error && err.message === "INVALID_WEBHOOK_SIGNATURE") {
        throw new BadRequestException("Invalid webhook signature");
      }
      if (err instanceof Error && err.message === "WEBHOOK_TOO_OLD") {
        throw new BadRequestException("Webhook event too old");
      }
      throw err;
    }
    if (!event) throw new BadRequestException("Unparseable webhook event");

    // Idempotency + replay detection: unique providerEventId.
    const { event: record, replayed } = await this.repo.recordWebhookEvent({
      providerEventId: event.providerEventId,
      type: event.type,
      payload: event.payload,
    });
    if (replayed) return { replayed: true, event: record };

    await this.applyWebhookEffect(event);
    await this.repo.markProcessed(record.id);
    return { replayed: false, event: record };
  }

  /** Retry previously unprocessed events (safe retry path). */
  async retryUnprocessed(): Promise<{ retried: number }> {
    const pending = await this.repo.findUnprocessedEvents();
    let retried = 0;
    for (const ev of pending) {
      try {
        const payload = (ev.payload ?? {}) as Record<string, unknown>;
        await this.applyWebhookEffect({
          providerEventId: ev.providerEventId,
          type: ev.type,
          payload,
        });
        await this.repo.markProcessed(ev.id);
        retried++;
      } catch {
        // Leave unprocessed for a later retry (dead-letter safe).
      }
    }
    return { retried };
  }

  /**
   * Out-of-order handling: transitions are only applied when they are
   * forward-valid for the current payment state (PENDING→SUCCEEDED etc.).
   */
  private async applyWebhookEffect(event: {
    providerEventId: string;
    type: string;
    payload: Record<string, unknown>;
  }) {
    const payload = event.payload;
    const ref = (payload.data as any)?.object?.id ?? (payload as any).object?.id ?? null;
    const payment = ref
      ? await this.repo.findByProviderRef(String(ref))
      : null;
    const paymentId = payment?.id ?? null;

    if (!paymentId) return; // Unknown payment — recorded already, no state change.

    const current = await this.repo.findByProviderRef(String(ref));
    if (!current) return;

    let next: string | null = null;
    if (event.type.includes("payment_intent.succeeded") && current.status === "PENDING") next = "SUCCEEDED";
    else if (event.type.includes("payment_intent.payment_failed") && current.status === "PENDING") next = "FAILED";
    else if (event.type.includes("charge.refunded") && ["SUCCEEDED", "PENDING"].includes(current.status)) next = "REFUNDED";

    if (next) {
      await this.repo.updateStatus(current.id, next, current.providerRef ?? undefined);
    }
    // Late/out-of-order events that don't match the current state are ignored.
  }
}
