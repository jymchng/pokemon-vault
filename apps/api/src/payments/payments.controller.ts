import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { Throttle } from "@nestjs/throttler";
import { PaymentsService } from "./payments.service";

/**
 * Payments.
 *   POST /webhooks/stripe           public (signature-verified by provider)
 *   POST /admin/payments/retry      STAFF+ safe retry of unprocessed webhooks
 *   GET  /admin/payments/:orderId   STAFF+ payment record
 *
 * Card numbers / CVVs are never accepted by any endpoint.
 */
@Controller()
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post("webhooks/stripe")
  @Throttle({ default: { limit: 120, ttl: 60_000 } }) // §52 — generous but bounded
  @HttpCode(HttpStatus.OK)
  async stripeWebhook(
    @Req() req: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ) {
    // Raw body is required for signature verification.
    const raw = (req.rawBody as string | undefined) ?? JSON.stringify(req.body ?? {});
    if (typeof raw !== "string" || raw.length === 0) {
      throw new BadRequestException("Empty webhook body");
    }
    return { data: await this.service.handleWebhook(raw, headers) };
  }

  @Post("admin/payments/retry")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.OK)
  async retry() {
    return { data: await this.service.retryUnprocessed() };
  }

  @Get("admin/payments/:orderId")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async get(@Param("orderId") orderId: string) {
    return { data: await this.service.getPayment(orderId) };
  }
}
