import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class RewardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Award purchase XP (G17 checkout step "award rewards"). Idempotent: a
   * PURCHASE transaction referencing the same order is never created twice.
   * Ledger (RewardTransaction) is the source of truth; RewardAccount.xp is a
   * cached balance updated in the same transaction.
   */
  async findAll(): Promise<unknown[]> {
    return this.prisma.rewardAccount.findMany({ include: { transactions: { take: 20, orderBy: { createdAt: "desc" } } } });
  }

  async awardPurchaseXp(userId: string, amountUsd: number, orderId: string): Promise<number> {
    const xp = Math.max(1, Math.floor(amountUsd)); // 1 XP per USD spent, min 1
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.rewardTransaction.findFirst({
        where: { reference: orderId, reason: "PURCHASE" },
      });
      if (existing) return 0; // idempotent — already awarded

      const account = await tx.rewardAccount.upsert({
        where: { userId },
        update: { xp: { increment: xp } },
        create: { userId, xp },
      });
      await tx.rewardTransaction.create({
        data: { accountId: account.id, delta: xp, reason: "PURCHASE", reference: orderId },
      });
      return xp;
    });
  }
}
