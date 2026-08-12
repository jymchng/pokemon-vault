/** Queue registry (§45) — shared queue names for API producers and worker consumers. */
export const QUEUES = [
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

export type QueueName = (typeof QUEUES)[number];

/** Default job options: retries with exponential backoff + jobId idempotency. */
export const DEFAULT_JOB_OPTS = {
  attempts: 5,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: 200,
  removeOnFail: 500,
};

export interface QueueJobPayload {
  [key: string]: unknown;
  idempotencyKey?: string;
}
