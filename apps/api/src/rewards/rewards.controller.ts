import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import {
  AwardXpSchema,
  CreateRewardSchema,
  CreateTierSchema,
  RedeemSchema,
  UpdateRewardSchema,
} from "./rewards.dto";
import { RewardsService } from "./rewards.service";

/**
 * Rewards (§38-42) — Collector XP (internal loyalty metric, NOT crypto).
 *   GET  /rewards/me           auth — account (xp, level, progress)
 *   GET  /rewards/ledger       auth — XP ledger history
 *   POST /rewards/redeem       auth — atomic redemption
 *   GET  /rewards/redemptions  auth — my redemptions
 *   GET  /rewards              public — reward catalog (ACTIVE)
 *   POST /rewards/xp           STAFF+ — grant XP (promo/milestone/admin)
 *   POST /rewards              STAFF+ — create reward
 *   PATCH /rewards/:id         STAFF+ — update reward
 *   GET  /rewards/tiers        public — configurable levels
 *   POST /rewards/tiers        STAFF+ — create tier
 */
@Controller("rewards")
export class RewardsController {
  constructor(private readonly service: RewardsService) {}

  @Get()
  async index() {
    return { data: await this.service.listRewards() };
  }

  @Get("tiers")
  async tiers() {
    return { data: await this.service.listTiers() };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    return { data: await this.service.getAccount(req.user.id) };
  }

  @Get("ledger")
  @UseGuards(AuthGuard)
  async ledger(@Req() req: any) {
    return { data: await this.service.ledger(req.user.id) };
  }

  @Get("redemptions")
  @UseGuards(AuthGuard)
  async redemptions(@Req() req: any) {
    return { data: await this.service.myRedemptions(req.user.id) };
  }

  @Post("redeem")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async redeem(@Req() req: any, @Body() body: unknown) {
    const parsed = RedeemSchema.parse(body);
    return { data: await this.service.redeem(req.user.id, parsed.rewardId) };
  }

  @Post("xp")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async awardXp(@Req() req: any, @Body() body: unknown) {
    const parsed = AwardXpSchema.parse(body);
    // STAFF may grant XP to any user; defaults to the caller's account.
    const target = parsed.userId ?? req.user.id;
    return { data: await this.service.awardXp(target, parsed) };
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async createReward(@Body() body: unknown) {
    const parsed = CreateRewardSchema.parse(body);
    return { data: await this.service.createReward(parsed) };
  }

  @Patch(":id")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  async updateReward(@Param("id") id: string, @Body() body: unknown) {
    const parsed = UpdateRewardSchema.parse(body);
    return { data: await this.service.updateReward(id, parsed) };
  }

  @Post("tiers")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.CREATED)
  async createTier(@Body() body: unknown) {
    const parsed = CreateTierSchema.parse(body);
    return { data: await this.service.createTier(parsed) };
  }
}
