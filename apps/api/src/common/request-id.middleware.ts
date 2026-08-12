import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";

/** Attach a requestId to every request (correlation, §66). */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: any, _res: any, next: () => void) {
    req.requestId = randomUUID().slice(0, 12);
    next();
  }
}
