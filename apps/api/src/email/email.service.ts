import { Inject, Injectable } from "@nestjs/common";
import { QueueService } from "../queue/queue.service";
import { EMAIL_PROVIDER, EmailMessage, EmailProvider } from "./email-provider.interface";

/**
 * Email service (§44): builds templated messages and ENQUEUES them to the
 * `email` BullMQ queue — never sends synchronously inside the request path.
 * The worker consumes the queue and dispatches to the configured provider.
 */
@Injectable()
export class EmailService {
  constructor(
    private readonly queue: QueueService,
    @Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider,
  ) {}

  private enqueue(template: string, to: string, subject: string, vars: Record<string, string | undefined> = {}, extra: Record<string, unknown> = {}) {
    const idempotencyKey =
      (extra.idempotencyKey as string | undefined) ??
      `email_${template}_${to}_${vars.orderNumber ?? vars.tokenHash ?? String(Date.now())}`;
    const text = `${subject}\n\nHello${vars.name ? ` ${vars.name}` : ""}, this is an automated message from Pokémon Vault.\n\n${vars.body ?? ""}`;
    const message: EmailMessage = {
      to,
      template,
      subject,
      text,
      metadata: { ...vars, ...extra },
      idempotencyKey,
    };
    // Queue it — the worker sends it via the provider.
    return this.queue.enqueue("email", `send:${template}`, { message: JSON.stringify(message) }, {
      jobId: idempotencyKey,
    });
  }

  sendWelcome(to: string, name?: string, idempotencyKey?: string) {
    return this.enqueue("welcome", to, "Welcome to Pokémon Vault!", { name, body: "Your account is ready. Happy collecting!" }, { idempotencyKey });
  }

  sendVerifyEmail(to: string, token: string, idempotencyKey?: string) {
    return this.enqueue("verify-email", to, "Verify your email address", { tokenHash: token.slice(0, 12), body: `Your verification code is ${token}` }, { idempotencyKey });
  }

  sendPasswordReset(to: string, token: string, idempotencyKey?: string) {
    return this.enqueue("password-reset", to, "Reset your password", { tokenHash: token.slice(0, 12), body: `Your password reset code is ${token}` }, { idempotencyKey });
  }

  sendOrderConfirmation(to: string, orderNumber: string, total: string, idempotencyKey?: string) {
    return this.enqueue("order-confirmation", to, `Order ${orderNumber} confirmed`, { orderNumber, body: `Your order ${orderNumber} (${total}) is confirmed.` }, { idempotencyKey });
  }

  sendShippingUpdate(to: string, orderNumber: string, trackingNumber: string, idempotencyKey?: string) {
    return this.enqueue("shipping", to, `Order ${orderNumber} shipped`, { orderNumber, body: `Tracking: ${trackingNumber}` }, { idempotencyKey });
  }

  sendDeliveryConfirmation(to: string, orderNumber: string, idempotencyKey?: string) {
    return this.enqueue("delivery", to, `Order ${orderNumber} delivered`, { orderNumber, body: "Your order has been delivered. Enjoy!" }, { idempotencyKey });
  }

  sendRewardUnlocked(to: string, rewardName: string, idempotencyKey?: string) {
    return this.enqueue("reward", to, `Reward unlocked: ${rewardName}`, { body: `You unlocked "${rewardName}" — redeem it in the Rewards tab.` }, { idempotencyKey });
  }
}
