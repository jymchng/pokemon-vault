import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable } from "@nestjs/common";

/** Per-request correlation context (§66): propagated through DB work, queues,
 *  workers, and outbound calls so one user action is traceable end to end. */
export interface CorrelationContext {
  requestId: string | null;
  userId: string | null;
}

/** Injectable ALS-backed correlation context. */
@Injectable()
export class CorrelationService {
  private readonly storage = new AsyncLocalStorage<CorrelationContext>();

  /** Run *fn* inside a correlation context (e.g. per HTTP request). */
  run<T>(ctx: CorrelationContext, fn: () => T): T {
    return this.storage.run(ctx, fn);
  }

  /** Current context (empty when outside any request). */
  get(): CorrelationContext {
    return this.storage.getStore() ?? { requestId: null, userId: null };
  }

  /** Attach the authenticated user id to the current context (from AuthGuard). */
  setUserId(userId: string | null): void {
    const store = this.storage.getStore();
    if (store) store.userId = userId;
  }

  /** Attach/override the request id of the current context. */
  setRequestId(requestId: string | null): void {
    const store = this.storage.getStore();
    if (store) store.requestId = requestId;
  }
}
