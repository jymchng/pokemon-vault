import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AwardXpDto,
  CreateRewardDto,
  CreateTierDto,
  UpdateRewardDto,
} from "./rewards.dto";
import { RewardsRepository } from "./rewards.repository";
import { MetricsService } from "../observability/metrics.service";
import { IdempotencyService } from "../common/idempotency.service";
import { FeatureFlagService } from "../config/feature-flag.service";
import { err as AppErrors } from "../common/app-error";

@Injectable()
export class RewardsService {
  constructor(
    private readonly repo: RewardsRepository,
    private readonly metrics: MetricsService,
    private readonly idempotency: IdempotencyService,
    private readonly flags: FeatureFlagService,
  ) {}

  // ---- Account / XP ----

  async getAccount(userId: string) {
    return this.repo.getAccountWithTiers(userId);
  }

  async ledger(userId: string) {
    return this.repo.listTransactions(userId);
  }

  /** Grant XP (promos/milestones/admin); idempotent when reference+reason given. */
  async awardXp(userId: string, input: AwardXpDto) {
    return { awarded: await this.repo.awardXp(userId, input.delta, input.reason, input.reference) };
  }

  async awardPurchaseXp(userId: string, amountUsd: number, orderId: string): Promise<number> {
    return this.repo.awardPurchaseXp(userId, amountUsd, orderId);
  }

  // ---- Rewards catalog (staff-managed) ----

  async listRewards() {
    return this.repo.listRewards();
  }

  async createReward(input: CreateRewardDto) {
    return this.repo.createReward(input);
  }

  async updateReward(id: string, input: UpdateRewardDto) {
    const updated = await this.repo.updateReward(id, input);
    if (!updated) throw new NotFoundException("Reward not found");
    return updated;
  }

  // ---- Redemption (§42 atomic) ----

  async redeem(userId: string, rewardId: string, idempotencyKey?: string) {
    // §107: REWARDS_ENABLED gates XP redemption at runtime.
    this.flags.assertEnabled("rewardsEnabled");
    // §91: idempotent redemption — safe client retries never double-redeem.
    if (idempotencyKey) {
      const { data } = await this.idempotency.run(
        "reward-redemption", idempotencyKey, userId, { rewardId },
        () => this.redeemOnce(userId, rewardId),
      );
      return data;
    }
    return this.redeemOnce(userId, rewardId);
  }

  private async redeemOnce(userId: string, rewardId: string) {
    try {
      const result = await this.repo.redeemReward(userId, rewardId);
      this.metrics.recordRewardRedeemed(); // §67
      return result;
    } catch (err: any) {
      if (err instanceof Error) {
        switch (err.message) {
          case "REWARD_NOT_FOUND":
            throw new NotFoundException("Reward not found");
          case "REWARD_DISABLED":
            throw new BadRequestException("Reward is disabled");
          case "REWARD_EXPIRED":
            throw new BadRequestException("Reward has expired");
          case "REWARD_OUT_OF_STOCK":
            throw AppErrors.rewardNotEligible();
          case "INSUFFICIENT_XP":
            throw AppErrors.rewardNotEligible();
          case "P2002":
            break;
        }
      }
      if (err?.code === "P2002") {
        throw new ConflictException("Reward already redeemed");
      }
      throw err;
    }
  }

  async myRedemptions(userId: string) {
    return this.repo.listRedemptions(userId);
  }

  // ---- Tiers ----

  async listTiers() {
    return this.repo.listTiers();
  }

  async createTier(input: CreateTierDto) {
    try {
      return await this.repo.createTier(input);
    } catch (err: any) {
      if (err?.code === "P2002") throw new ConflictException("Tier level already exists");
      throw err;
    }
  }

  async list() {
    return this.repo.findAll();
  }
}
