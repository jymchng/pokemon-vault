import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { Throttle } from "@nestjs/throttler";
import { CheckoutDto, CheckoutSchema, PayDto, PaySchema } from "./checkout.dto";
import { CheckoutService } from "./checkout.service";

/**
 * Checkout (authenticated).
 *   POST /checkout                      start: verify stock → reserve → order PENDING
 *   POST /checkout/:orderId/pay         mock payment → finalize reservation→sale
 *   POST /checkout/:orderId/cancel      release reservations + cancel
 *   GET  /checkout/:orderId             order detail (owner)
 */
@Controller("checkout")
@UseGuards(AuthGuard)
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async start(@Req() req: any, @Body() body: unknown) {
    const parsed = CheckoutSchema.parse(body) as CheckoutDto;
    const result = await this.service.startCheckout(req.user.id, null, parsed);
    return {
      data: {
        order: result.order,
        reservations: result.reservations,
      },
    };
  }

  @Post(":orderId/pay")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async pay(@Req() req: any, @Param("orderId") orderId: string, @Body() body: unknown) {
    const parsed = PaySchema.parse(body) as PayDto;
    return { data: await this.service.pay(orderId, req.user.id, parsed) };
  }

  @Post(":orderId/cancel")
  @HttpCode(HttpStatus.OK)
  async cancel(@Req() req: any, @Param("orderId") orderId: string) {
    return { data: await this.service.cancel(orderId, req.user.id) };
  }

  @Get(":orderId")
  async get(@Req() req: any, @Param("orderId") orderId: string) {
    return { data: await this.service.getOrder(orderId, req.user.id) };
  }
}
