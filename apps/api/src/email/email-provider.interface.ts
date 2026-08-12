/** Email provider abstraction (§44) — the app depends only on this contract. */

export interface EmailMessage {
  to: string;
  template: string; // welcome | verify-email | password-reset | order-confirmation | shipping | delivery | reward
  subject: string;
  text: string;
  html?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ providerMessageId: string }>;
}

export const EMAIL_PROVIDER = "EMAIL_PROVIDER";
