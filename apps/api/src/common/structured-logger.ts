import { Injectable, LoggerService, Scope } from "@nestjs/common";
import { CorrelationService } from "./correlation.service";

/**
 * Redaction (§65): passwords, tokens, card data, API secrets, and cookies must
 * NEVER appear in logs. Keys are matched case-insensitively; values that look
 * like live secrets (Stripe keys, AWS access keys, Doppler tokens, JWTs,
 * private keys, Bearer tokens) are masked as a belt-and-braces measure.
 */

const SENSITIVE_KEYS = new Set([
  "password",
  "pass",
  "pwd",
  "passphrase",
  "passwordhash",
  "hash",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "idtoken",
  "id_token",
  "authorization",
  "cookie",
  "sessionid",
  "sessiontoken",
  "cardnumber",
  "card_number",
  "cardnum",
  "ccnumber",
  "pan",
  "cvv",
  "cvc",
  "secret",
  "clientsecret",
  "client_secret",
  "apikey",
  "api_key",
  "apisecret",
  "privatekey",
  "private_key",
  "webhooksecret",
  "webhook_secret",
  "jwt",
  "jwtsecret",
  "jwt_secret",
  "dsn",
  "connectionstring",
  "database_url",
  "stripekey",
  "stripe_secret",
]);

const SECRET_VALUE_PATTERNS = [
  /sk_(live|test)_[A-Za-z0-9]{16,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /dp\.(pt|st)\.[A-Za-z0-9]{20,}/g,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g, // JWT
  /BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY/g,
  /Bearer [A-Za-z0-9._-]{16,}/g,
];

/** Deep-redact a value for logging: sensitive keys → "***", secret-like
 *  values are masked in strings. Never mutates the original. */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "<max-depth>";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    let out = value;
    for (const re of SECRET_VALUE_PATTERNS) out = out.replace(re, "***");
    return out;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEYS.has(k.toLowerCase()) ? "***" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type LogLevel = "log" | "error" | "warn" | "debug" | "verbose";

/**
 * Structured JSON logger (§65): every line is a JSON object with
 *   { ts, level, service, environment, request_id, user_id, message, ...meta }
 * request_id / user_id come from the AsyncLocalStorage correlation context
 * (set per request and propagated into queue jobs), so one user action is
 * traceable across API, DB, queues, and workers. All output passes through
 * redact() — secrets never reach the log.
 *
 * Registered via app.useLogger(new StructuredLogger("api")) so every
 * `new Logger(...)` in the app emits structured JSON.
 */
@Injectable({ scope: Scope.DEFAULT })
export class StructuredLogger implements LoggerService {
  private readonly service: string;

  constructor(service: string = "api", private readonly correlation?: CorrelationService) {
    this.service = service;
  }

  private emit(level: LogLevel, message: unknown, context?: string, meta: Record<string, unknown> = {}): void {
    const ctx = this.correlation?.get() ?? { requestId: null, userId: null };
    const messageOut =
      typeof message === "string" ? message : safeStringify(redact(message));
    const entry = {
      ts: new Date().toISOString(),
      level,
      service: this.service,
      environment: process.env.NODE_ENV || "development",
      request_id: ctx.requestId ?? null,
      user_id: ctx.userId ?? null,
      message: messageOut,
      ...(context ? { context } : {}),
      ...meta,
    };
    const line = JSON.stringify(redact(entry));
    // eslint-disable-next-line no-console
    console.log(line);
  }

  log(message: unknown, ...optional: unknown[]): void {
    this.emit("log", message, this.extractContext(optional));
  }
  error(message: unknown, ...optional: unknown[]): void {
    this.emit("error", message, this.extractContext(optional));
  }
  warn(message: unknown, ...optional: unknown[]): void {
    this.emit("warn", message, this.extractContext(optional));
  }
  debug(message: unknown, ...optional: unknown[]): void {
    this.emit("debug", message, this.extractContext(optional));
  }
  verbose(message: unknown, ...optional: unknown[]): void {
    this.emit("verbose", message, this.extractContext(optional));
  }
  fatal?(message: unknown, ...optional: unknown[]): void {
    this.emit("error", message, this.extractContext(optional));
  }

  private extractContext(optional: unknown[]): string | undefined {
    for (const p of optional) if (typeof p === "string") return p;
    return undefined;
  }
}

/** Stringify a message that is not a string (errors → message + safe stack). */
function safeStringify(value: unknown): string {
  if (value instanceof Error) {
    return `${value.message}${value.stack ? `\n${value.stack}` : ""}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
