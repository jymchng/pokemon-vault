import { Module, MiddlewareConsumer } from "@nestjs/common";
import { RequestIdMiddleware } from "./request-id.middleware";

/** Global middleware (request IDs). */
@Module({})
export class CommonModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
