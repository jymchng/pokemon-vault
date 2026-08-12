import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { Queue, JobsOptions } from "bullmq";
import IORedis from "ioredis";
import { DEFAULT_JOB_OPTS, QueueName, QUEUES } from "./queue.constants";
import { CorrelationService } from "../common/correlation.service";

/** Build an ioredis connection from REDIS_URL (default redis://localhost:6379). */
export function buildRedisConnection(): IORedis {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  return new IORedis(url, { maxRetriesPerRequest: null });
}

/**
 * Queue producer (§45): one BullMQ Queue per domain queue. All enqueues are
 * fire-and-forget (never synchronous work in the request path); retries use
 * exponential backoff; jobId enables idempotent enqueues.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<QueueName, Queue>();
  private readonly connection: IORedis;

  constructor(private readonly correlation: CorrelationService) {
    this.connection = buildRedisConnection();
    for (const name of QUEUES) {
      this.queues.set(name, new Queue(name, { connection: this.connection }));
    }
  }

  getQueue(name: QueueName): Queue {
    return this.queues.get(name)!;
  }

  /**
   * Enqueue a job. `jobId` (from payload.idempotencyKey or explicit) makes the
   * enqueue idempotent — BullMQ dedupes identical jobIds. The current
   * correlation context (request_id / user_id, §66) is attached to the job so
   * the worker can log and trace the job back to the originating request.
   */
  async enqueue(
    name: QueueName,
    jobName: string,
    data: Record<string, unknown>,
    opts: Partial<JobsOptions> = {},
  ): Promise<string | undefined> {
    const queue = this.getQueue(name);
    const jobId =
      opts.jobId ??
      (typeof data.idempotencyKey === "string" ? data.idempotencyKey : undefined);
    const { requestId, userId } = this.correlation.get();
    const payload = {
      ...data,
      ...(requestId || userId
        ? { _correlation: { requestId, userId } }
        : {}),
    };
    const job = await queue.add(jobName, payload, {
      ...DEFAULT_JOB_OPTS,
      ...(jobId ? { jobId } : {}),
      ...opts,
    });
    this.logger.debug(`Enqueued ${name}.${jobName} (job ${job.id})`);
    return job.id;
  }

  async getCounts(name: QueueName): Promise<Record<string, number>> {
    const q = this.getQueue(name);
    return q.getJobCounts("waiting", "active", "completed", "failed", "delayed");
  }

  async onModuleDestroy(): Promise<void> {
    for (const q of this.queues.values()) await q.close();
    await this.connection.quit();
  }
}
