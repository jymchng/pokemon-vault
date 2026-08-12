import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  RewardAccountDto,
  RewardDto,
  RewardRedemptionDto,
  RewardTransactionDto,
} from "./rewards.dto";

const DEFAULT_TIERS = [
  { name: "Level 1 — Collector", level: 1, xpRequired: 0 },
  { name: "Level 2 — Enthusiast", level: 2, xpRequired: 250 },
  { name: "Level 3 — Trainer", level: 3, xpRequired: 500 },
  { name: "Level 4 — Master", level: 4, xpRequired: 1000 },
  { name: "Level 5 — Legend", level: 5, xpRequired: 2000 },
];

@Injectable()
export class RewardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Account / XP ledger ----

  async getAccountWithTiers(userId: string): Promise<RewardAccountDto> {
    const account = await this.prisma.rewardAccount.upsert({
      where: { userId },
      update: {},
      create: { userId, xp: 0 },
    });
    let tiers = await this.prisma.rewardTier.findMany({ orderBy: { level: "asc" } });
    if (tiers.length === 0) {
      await this.prisma.rewardTier.createMany({ data: DEFAULT_TIERS });
      tiers = await this.prisma.rewardTier.findMany({ orderBy: { level: "asc" } });
    }
    let current = tiers[0] ?? { level: 1, name: "Level 1", xpRequired: 0 };
    for (const t of tiers) {
      if (account.xp >= t.xpRequired) current = t;
    }
    const next = tiers.find((t) => t.xpRequired > account.xp) ?? null;
    const progressPercent =
      next && next.xpRequired > current.xpRequired
        ? Math.min(100, Math.round(((account.xp - current.xpRequired) / (next.xpRequired - current.xpRequired)) * 100))
        : 100;
    return {
      id: account.id,
      userId: account.userId,
      xp: account.xp,
      level: current.level,
      levelName: current.name,
      xpRequiredForNext: next?.xpRequired ?? null,
      progressPercent,
      updatedAt: account.updatedAt,
    };
  }

  async listTransactions(userId: string, limit = 50): Promise<RewardTransactionDto[]> {
    const account = await this.prisma.rewardAccount.findUnique({ where: { userId } });
    if (!account) return [];
    const rows = await this.prisma.rewardTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      delta: r.delta,
      reason: r.reason,
      reference: r.reference,
      createdAt: r.createdAt,
    }));
  }

  /** Ledger append with cached-balance update (single tx). Idempotent per account+reference+reason. */
  async awardXp(userId: string, delta: number, reason: string, reference?: string | null): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.rewardAccount.upsert({
        where: { userId },
        update: {},
        create: { userId, xp: 0 },
      });
      if (reference) {
        const existing = await tx.rewardTransaction.findFirst({
          where: { accountId: account.id, reference, reason },
        });
        if (existing) return 0; // idempotent
      }
      await tx.rewardAccount.update({
        where: { id: account.id },
        data: { xp: { increment: delta } },
      });
      await tx.rewardTransaction.create({
        data: { accountId: account.id, delta, reason, reference: reference ?? null },
      });
      return delta;
    });
  }

  // ---- Rewards catalog ----

  async listRewards(): Promise<RewardDto[]> {
    const rows = await this.prisma.reward.findMany({ orderBy: { xpCost: "asc" } });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      type: r.type,
      xpCost: r.xpCost,
      inventory: r.inventory,
      status: r.status,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  }

  async findReward(id: string): Promise<RewardDto | null> {
    const row = await this.prisma.reward.findUnique({ where: { id } });
    return row
      ? {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          xpCost: row.xpCost,
          inventory: row.inventory,
          status: row.status,
          expiresAt: row.expiresAt,
          createdAt: row.createdAt,
        }
      : null;
  }

  async createReward(data: any): Promise<RewardDto> {
    const row = await this.prisma.reward.create({
      data: {
        name: data.name,
        description: data.description ?? null,
        type: data.type ?? "OTHER",
        xpCost: data.xpCost,
        inventory: data.inventory ?? 0,
        status: data.status ?? "ACTIVE",
        expiresAt: data.expiresAt ?? null,
      },
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      type: row.type,
      xpCost: row.xpCost,
      inventory: row.inventory,
      status: row.status,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    };
  }

  async updateReward(id: string, data: any): Promise<RewardDto | null> {
    const row = await this.prisma.reward.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.xpCost !== undefined ? { xpCost: data.xpCost } : {}),
        ...(data.inventory !== undefined ? { inventory: data.inventory } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.expiresAt !== undefined ? { expiresAt: data.expiresAt ?? null } : {}),
      },
    });
    return row
      ? {
          id: row.id,
          name: row.name,
          description: row.description,
          type: row.type,
          xpCost: row.xpCost,
          inventory: row.inventory,
          status: row.status,
          expiresAt: row.expiresAt,
          createdAt: row.createdAt,
        }
      : null;
  }

  /**
   * Atomic redemption (§42): verify eligibility+balance → reserve reward
   * inventory → deduct XP → create redemption — all in ONE transaction.
   * @@unique([accountId, rewardId]) prevents double redemption.
   */
  async redeemReward(userId: string, rewardId: string): Promise<RewardRedemptionDto> {
    return this.prisma.$transaction(async (tx) => {
      const account = await tx.rewardAccount.upsert({
        where: { userId },
        update: {},
        create: { userId, xp: 0 },
      });
      const reward = await tx.reward.findUnique({ where: { id: rewardId } });
      if (!reward) throw new Error("REWARD_NOT_FOUND");
      if (reward.status !== "ACTIVE") throw new Error("REWARD_DISABLED");
      if (reward.expiresAt && reward.expiresAt < new Date()) throw new Error("REWARD_EXPIRED");
      if (reward.inventory <= 0) throw new Error("REWARD_OUT_OF_STOCK");
      if (account.xp < reward.xpCost) throw new Error("INSUFFICIENT_XP");

      // Reserve inventory + deduct XP (guarded updates).
      const invRes = await tx.reward.updateMany({
        where: { id: rewardId, inventory: { gt: 0 } },
        data: { inventory: { decrement: 1 } },
      });
      if (invRes.count !== 1) throw new Error("REWARD_OUT_OF_STOCK");

      const xpRes = await tx.rewardAccount.updateMany({
        where: { id: account.id, xp: { gte: reward.xpCost } },
        data: { xp: { decrement: reward.xpCost } },
      });
      if (xpRes.count !== 1) {
        await tx.reward.update({ where: { id: rewardId }, data: { inventory: { increment: 1 } } });
        throw new Error("INSUFFICIENT_XP");
      }

      await tx.rewardTransaction.create({
        data: {
          accountId: account.id,
          delta: -reward.xpCost,
          reason: "REDEMPTION",
          reference: rewardId,
        },
      });

      const redemption = await tx.rewardRedemption.create({
        data: { accountId: account.id, rewardId, userId, status: "REDEEMED" },
      });
      return {
        id: redemption.id,
        accountId: redemption.accountId,
        rewardId: redemption.rewardId,
        rewardName: reward.name,
        userId: redemption.userId,
        status: redemption.status,
        createdAt: redemption.createdAt,
      };
    });
  }

  async listRedemptions(userId: string): Promise<RewardRedemptionDto[]> {
    const rows = await this.prisma.rewardRedemption.findMany({
      where: { userId },
      include: { reward: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      accountId: r.accountId,
      rewardId: r.rewardId,
      rewardName: r.reward.name,
      userId: r.userId,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }

  async listTiers() {
    return this.prisma.rewardTier.findMany({ orderBy: { level: "asc" } });
  }

  async createTier(data: { name: string; level: number; xpRequired: number }) {
    return this.prisma.rewardTier.create({ data });
  }

  async findAll() {
    return this.prisma.rewardAccount.findMany({
      include: { transactions: { take: 20, orderBy: { createdAt: "desc" } } },
    });
  }

  async awardPurchaseXp(userId: string, amountUsd: number, orderId: string): Promise<number> {
    const xp = Math.max(1, Math.floor(amountUsd));
    return this.awardXp(userId, xp, "PURCHASE", orderId);
  }
}
