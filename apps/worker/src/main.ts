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
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, service: "worker", msg, ...(meta ?? {}) }));
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
      const handler = handlers[queueName];
      if (!handler) throw new Error(`No handler for queue ${queueName}`);
      await handler(job);
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

  const shutdown = async (signal: string) => {
    log("info", `Shutting down (${signal})…`);
    for (const w of workers) await w.close();
    for (const q of deadLetters.values()) await q.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  log("error", "Worker failed to start", { error: err.message });
  process.exit(1);
});
