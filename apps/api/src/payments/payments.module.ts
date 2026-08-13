import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentsRepository } from "./payments.repository";
import { PAYMENT_PROVIDER } from "./payment-provider.token";
import { StripePaymentProvider } from "./providers/stripe.provider";
import { TestPaymentProvider } from "./providers/test.provider";

/** Attach a raw-body string for webhook signature verification. Nest's built-in
 * body parser has already consumed the stream by the time route middleware runs,
 * so we re-serialize the parsed body (byte-exact capture is a production concern
 * handled by a dedicated raw-body proxy; this keeps local/dev webhooks working). */
function rawBodyMiddleware(req: any, _res: any, next: () => void) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    req.rawBody = JSON.stringify(req.body);
  } else if (typeof req.body === "string") {
    req.rawBody = req.body;
  }
  next();
}

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsRepository,
    {
      provide: PAYMENT_PROVIDER,
      useFactory: () => {
        const name = process.env.POKE_VAULT_PAYMENT_PROVIDER || "test";
        if (name === "stripe") {
          const secret = process.env.POKE_VAULT_STRIPE_WEBHOOK_SECRET || "";
          if (!secret) throw new Error("POKE_VAULT_STRIPE_WEBHOOK_SECRET must be set when POKE_VAULT_PAYMENT_PROVIDER=stripe");
          return new StripePaymentProvider(secret);
        }
        return new TestPaymentProvider();
      },
    },
  ],
  exports: [PaymentsService, PAYMENT_PROVIDER],
})
export class PaymentsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(rawBodyMiddleware).forRoutes("webhooks/stripe");
  }
}
