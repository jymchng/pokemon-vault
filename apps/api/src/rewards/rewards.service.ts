import { Injectable } from "@nestjs/common";
import { RewardsRepository } from "./rewards.repository";

@Injectable()
export class RewardsService {
  constructor(private readonly repo: RewardsRepository) {}

  /** Award Collector XP for a completed purchase (idempotent per order). */
  async list(): Promise<unknown[]> {
    return this.repo.findAll();
  }

  async awardPurchaseXp(userId: string, amountUsd: number, orderId: string): Promise<number> {
    return this.repo.awardPurchaseXp(userId, amountUsd, orderId);
  }
}
