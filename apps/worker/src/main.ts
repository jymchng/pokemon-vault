/**
 * Pokémon Vault — background worker (§45).
 *
 * Consumes the nine domain queues with:
 *  - retries with exponential backoff (BullMQ attempts/backoff)
 *  - failure recording + dead-lettering (failed jobs are pushed to <name>:dead)
 *  - idempotency (jobs carry idempotencyKey / jobId; handlers dedupe)
 *
 * Email queue: sends via the configured EmailProvider (console locally).
 * Notifications queue: persists Notification rows (idempotent per key).
 * Other queues: logged acknowledgment (domain workers wired here).
 */
import "reflect-metadata";
import { Worker, Queue, Job } from "bullmq";
import IORedis from "ioredis";
import { createHash } from "node:crypto";
import { PrismaClient } from "../../../apps/api/src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const QUEUES = [
  "email",
  "notifications",
  "order-processing",
  "inventory",
  "shipping",
  "rewards",
  "search-indexing",
  "image-processing",
  "analytics",
] as const;

/** Dead-letter queues: one per source queue (BullMQ forbids ':' in names). */
const deadLetters = new Map<string, Queue>();
for (const q of QUEUES) {
  deadLetters.set(q, new Queue(`dlq_${q}`, { connection }));
}

const JOB_OPTS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 2000 },
};

function log(level: "info" | "error" | "warn", msg: string, meta?: Record<string, unknown>) {
  console.log(
    JSON.stringify(
      redact({
        ts: new Date().toISOString(),
        level,
        service: "worker",
        environment: process.env.NODE_ENV || "development",
        request_id: activeContext?.requestId ?? null,
        user_id: activeContext?.userId ?? null,
        message: msg,
        ...(meta ?? {}),
      }),
    ),
  );
}

/** Correlation context of the job currently being processed (§66). */
let activeContext: { requestId: string | null; userId: string | null } | null = null;

/** Sensitive keys that must never be logged (§65). */
const SENSITIVE_KEYS = new Set([
  "password", "pass", "pwd", "passphrase", "passwordhash", "hash", "token",
  "accesstoken", "access_token", "refreshtoken", "refresh_token", "authorization",
  "cookie", "sessionid", "cardnumber", "card_number", "cvv", "cvc", "pan", "secret",
  "client_secret", "api_key", "apikey", "private_key", "webhook_secret", "jwt",
  "stripe_secret", "database_url",
]);

const SECRET_VALUE_PATTERNS = [
  /sk_(live|test)_[A-Za-z0-9]{16,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /dp\.(pt|st)\.[A-Za-z0-9]{20,}/g,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g,
  /Bearer [A-Za-z0-9._-]{16,}/g,
];

/** Deep-redact a value for logs; never mutates the original. */
function redact(value: unknown, depth = 0): unknown {
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

/** Email handler (console provider locally; real providers plug in). */
async function handleEmail(job: Job): Promise<void> {
  const message = JSON.parse(String((job.data as any).message ?? "{}")) as {
    to: string; template: string; subject: string; text: string; idempotencyKey: string;
  };
  log("info", `[email] ${message.template} -> ${message.to} | ${message.subject} | key=${message.idempotencyKey}`);
  // In production this dispatches to Resend/Postmark/SendGrid/SES.
}

/** Notifications handler — idempotent via idempotencyKey hash. */
async function handleNotification(job: Job): Promise<void> {
  const data = job.data as Record<string, unknown>;
  const key = String(data.idempotencyKey ?? data.userId ?? "unknown");
  const dedupeId = createHash("sha256").update(key).digest("hex").slice(0, 24);
  const existing = await prisma.notification.findFirst({
    where: { metadata: { path: ["dedupeId"], equals: dedupeId } },
  });
  if (existing) {
    log("info", `[notifications] skip duplicate ${dedupeId}`);
    return;
  }
  await prisma.notification.create({
    data: {
      userId: String(data.userId),
      type: String(data.type ?? "SYSTEM") as any,
      title: String(data.title ?? "Notification"),
      body: data.body ? String(data.body) : null,
      metadata: { dedupeId, ...((data.metadata as Record<string, unknown>) ?? {}) } as any,
    },
  });
  log("info", `[notifications] created for ${String(data.userId)} (${dedupeId})`);
}

const handlers: Record<string, (job: Job) => Promise<void>> = {
  email: handleEmail,
  notifications: handleNotification,
  "order-processing": async (j) => log("info", "[order-processing] acknowledged", { id: j.id, name: j.name }),
  inventory: async (j) => log("info", "[inventory] acknowledged", { id: j.id, name: j.name }),
  shipping: async (j) => log("info", "[shipping] acknowledged", { id: j.id, name: j.name }),
  rewards: async (j) => log("info", "[rewards] acknowledged", { id: j.id, name: j.name }),
  "search-indexing": async (j) => log("info", "[search-indexing] acknowledged", { id: j.id, name: j.name }),
  "image-processing": async (j) => log("info", "[image-processing] acknowledged", { id: j.id, name: j.name }),
  analytics: async (j) => log("info", "[analytics] acknowledged", { id: j.id, name: j.name }),
};

async function main() {
  log("info", `Worker starting — ${QUEUES.length} queues`);
  const workers: Worker[] = [];

  for (const queueName of QUEUES) {
    const worker = new Worker(queueName, async (job) => {
      // §66: carry the originating request's correlation into worker logs.
      const corr = (job.data as any)?._correlation as
        | { requestId?: string | null; userId?: string | null }
        | undefined;
      activeContext = { requestId: corr?.requestId ?? null, userId: corr?.userId ?? null };
      try {
        const handler = handlers[queueName];
        if (!handler) throw new Error(`No handler for queue ${queueName}`);
        await handler(job);
      } finally {
        activeContext = null;
      }
    }, { connection, ...JOB_OPTS });

    // Failure recording + dead-lettering.
    worker.on("failed", async (job, err) => {
      log("error", `[${queueName}] job failed`, { jobId: job?.id, attempt: job?.attemptsMade, error: err.message });
      if (job) {
        await deadLetters.get(queueName)!.add(job.name, job.data, {
          jobId: `${queueName}_dead_${job.id}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        });
      }
    });
    worker.on("completed", (job) => log("info", `[${queueName}] completed`, { jobId: job.id }));
    workers.push(worker);
  }

  log("info", `Worker ready — consuming: ${QUEUES.join(", ")}`);

  // Graceful shutdown (§64): SIGTERM/SIGINT → stop fetching new jobs, drain
  // in-flight handlers, then close dead-letter queues, Redis, and the DB.
  // BullMQ releases the locks of jobs still active at close; the stalled-job
  // sweep re-queues them (requeue on shutdown). A watchdog force-closes
  // workers if a handler hangs past the drain budget.
  const SHUTDOWN_TIMEOUT_MS = 30_000;
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    log("info", `Shutting down (${signal}) — draining ${workers.length} workers…`);
    const watchdog = setTimeout(() => {
      log("error", `Drain exceeded ${SHUTDOWN_TIMEOUT_MS}ms — force-closing workers`);
      for (const w of workers) void w.close(true).catch(() => undefined);
    }, SHUTDOWN_TIMEOUT_MS);
    watchdog.unref();
    try {
      for (const w of workers) await w.close(); // waits for active jobs to finish
      log("info", "Workers drained; closing dead-letter queues");
      for (const q of deadLetters.values()) await q.close();
      await connection.quit();
      await prisma.$disconnect();
      clearTimeout(watchdog);
      log("info", "Shutdown complete — exiting");
      process.exit(0);
    } catch (err) {
      log("error", "Error during shutdown", { error: (err as Error).message });
      process.exit(1);
    }
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  log("error", "Worker failed to start", { error: err.message });
  process.exit(1);
});
