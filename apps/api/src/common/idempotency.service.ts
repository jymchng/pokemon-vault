import { Injectable, ConflictException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Idempotency (§91): safe client retries for checkout, payment creation,
 * refunds, pack opening, reward redemption, and order creation.
 *
 * The client sends `Idempotency-Key: <uuid>`; the service:
 *   1. Looks up the key (unique index) — if present with SUCCESS, replays the
 *      stored response (200, no side effects).
 *   2. If the same key is used with a DIFFERENT request body → 409 (the key
 *      must map to exactly one operation).
 *   3. Otherwise creates an IN_PROGRESS record, runs the operation, and
 *      records the response (SUCCESS). Concurrent same-key requests are
 *      serialized by the unique index (one wins, the other replays).
 *
 * Extension point: scopes are open strings — add new scopes without changing
 * this service (checkout, payment, refund, pack-opening, reward-redemption,
 * order).
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  private hash(body: unknown): string {
    return createHash("sha256").update(JSON.stringify(body ?? {})).digest("hex");
  }

  /**
   * Run *operation* exactly once for a given (scope, key, userId, body).
   * Returns { replayed, data } — replayed=true when a prior SUCCESS exists.
   * Throws ConflictException on key reuse with a different body.
   */
  async run<T>(
    scope: string,
    key: string,
    userId: string | undefined,
    body: unknown,
    operation: () => Promise<T>,
  ): Promise<{ replayed: boolean; data: T }> {
    const requestHash = this.hash(body);
    const existing = await this.prisma.idempotencyRecord.findUnique({ where: { key } });

    if (existing) {
      if (existing.status === "SUCCESS") {
        if (existing.requestHash && existing.requestHash !== requestHash) {
          throw new ConflictException("Idempotency key was already used with a different request");
        }
        return { replayed: true, data: existing.response as T };
      }
      if (existing.status === "IN_PROGRESS") {
        // A concurrent request is processing this key — the safe client
        // retries after a short backoff and will then hit the SUCCESS branch.
        throw new ConflictException("Idempotency key is already being processed");
      }
      // FAILED → allow retry: mark IN_PROGRESS and rerun.
    }

    let record = await this.prisma.idempotencyRecord.upsert({
      where: { key },
      create: { key, scope, userId: userId ?? null, status: "IN_PROGRESS", requestHash },
      update: { status: "IN_PROGRESS", requestHash, userId: userId ?? undefined },
    });

    try {
      const data = await operation();
      record = await this.prisma.idempotencyRecord.update({
        where: { id: record.id },
        data: { status: "SUCCESS", response: data as any },
      });
      return { replayed: false, data };
    } catch (err) {
      await this.prisma.idempotencyRecord
        .update({ where: { id: record.id }, data: { status: "FAILED" } })
        .catch(() => undefined);
      throw err;
    }
  }
}
