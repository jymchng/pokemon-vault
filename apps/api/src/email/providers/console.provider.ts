import { randomBytes } from "node:crypto";
import { EmailMessage, EmailProvider } from "../email-provider.interface";

/**
 * Console/log email provider for local development — records the message and
 * returns a deterministic message id. Real providers (Resend/Postmark/SendGrid/
 * SES) implement the same contract and are selected via EMAIL_PROVIDER env.
 */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";

  async send(message: EmailMessage): Promise<{ providerMessageId: string }> {
    const providerMessageId = `msg_${randomBytes(8).toString("hex")}`;
    console.log(
      `[email:console] ${message.template} -> ${message.to} | ${message.subject} | id=${providerMessageId} | key=${message.idempotencyKey}`,
    );
    return { providerMessageId };
  }
}
