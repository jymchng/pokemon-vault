import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityDto, CollectionItemDto, SetProgressDto } from "./collection.dto";

@Injectable()
export class CollectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Get-or-create the user's collection (userId has no unique constraint). */
  async getOrCreateCollection(userId: string) {
    const existing = await this.prisma.collection.findFirst({ where: { userId } });
    if (existing) return existing;
    return this.prisma.collection.create({ data: { userId, name: "My Collection" } });
  }

  async findCollection(userId: string) {
    return this.prisma.collection.findFirst({ where: { userId } });
  }

  async findItems(userId: string): Promise<CollectionItemDto[]> {
    const collection = await this.findCollection(userId);
    if (!collection) return [];
    const rows = await this.prisma.collectionItem.findMany({
      where: { collectionId: collection.id },
      include: {
        card: { select: { id: true, name: true, cardNumber: true, rarity: true, setName: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({
      id: r.id,
      collectionId: r.collectionId,
      cardId: r.cardId,
      cardName: r.card.name,
      cardNumber: r.card.cardNumber,
      rarity: r.card.rarity,
      setName: r.card.setName,
      quantity: r.quantity,
      condition: r.condition,
      grade: r.grade,
      source: r.source,
      acquiredAt: r.acquiredAt,
      purchaseOrderId: r.purchaseOrderId,
    }));
  }

  async findItem(userId: string, cardId: string) {
    const collection = await this.findCollection(userId);
    if (!collection) return null;
    return this.prisma.collectionItem.findUnique({
      where: { collectionId_cardId: { collectionId: collection.id, cardId } },
    });
  }

  async addItem(userId: string, data: any): Promise<CollectionItemDto> {
    const collection = await this.getOrCreateCollection(userId);
    // Upsert merges quantities for multiple copies of the same card.
    await this.prisma.collectionItem.upsert({
      where: { collectionId_cardId: { collectionId: collection.id, cardId: data.cardId } },
      update: { quantity: { increment: data.quantity } },
      create: {
        collectionId: collection.id,
        userId,
        cardId: data.cardId,
        quantity: data.quantity,
        condition: data.condition ?? null,
        grade: data.grade ?? null,
        source: data.source ?? "MANUAL_ENTRY",
        acquiredAt: data.acquiredAt ?? new Date(),
        purchaseOrderId: data.purchaseOrderId ?? null,
      },
    });
    const item = await this.findItem(userId, data.cardId);
    return (await this.findItems(userId)).find((i) => i.cardId === data.cardId)!;
  }

  async updateItem(userId: string, cardId: string, data: any): Promise<CollectionItemDto | null> {
    const collection = await this.findCollection(userId);
    if (!collection) return null;
    const updated = await this.prisma.collectionItem.updateMany({
      where: { collectionId: collection.id, cardId },
      data: {
        ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
        ...(data.condition !== undefined ? { condition: data.condition ?? null } : {}),
        ...(data.grade !== undefined ? { grade: data.grade ?? null } : {}),
        ...(data.source !== undefined ? { source: data.source } : {}),
        ...(data.acquiredAt !== undefined ? { acquiredAt: data.acquiredAt ?? null } : {}),
        ...(data.purchaseOrderId !== undefined ? { purchaseOrderId: data.purchaseOrderId ?? null } : {}),
      },
    });
    if (updated.count !== 1) return null;
    return (await this.findItems(userId)).find((i) => i.cardId === cardId) ?? null;
  }

  /** Remove (reduce) quantity; delete row when it reaches 0. */
  async removeItem(userId: string, cardId: string, quantityToRemove = 1): Promise<boolean> {
    const collection = await this.findCollection(userId);
    if (!collection) return false;
    const item = await this.findItem(userId, cardId);
    if (!item) return false;
    const remaining = item.quantity - quantityToRemove;
    if (remaining <= 0) {
      await this.prisma.collectionItem.deleteMany({
        where: { collectionId: collection.id, cardId },
      });
    } else {
      await this.prisma.collectionItem.updateMany({
        where: { collectionId: collection.id, cardId },
        data: { quantity: remaining },
      });
    }
    return true;
  }

  /**
   * Set progress (§33) — N+1-safe: one query for owned counts grouped by set,
   * one for set totals; no per-set loop.
   */
  async setProgress(userId: string): Promise<SetProgressDto[]> {
    const collection = await this.findCollection(userId);
    if (!collection) return [];
    const ownedRows = await this.prisma.collectionItem.groupBy({
      by: ["cardId"],
      where: { collectionId: collection.id, quantity: { gt: 0 } },
      _count: { cardId: true },
    });
    const ownedCardIds = ownedRows.map((r) => r.cardId);

    const cards = await this.prisma.card.findMany({
      where: { id: { in: ownedCardIds } },
      select: { id: true, setId: true },
    });
    const ownedBySet = new Map<string, number>();
    for (const c of cards) {
      if (!c.setId) continue;
      ownedBySet.set(c.setId, (ownedBySet.get(c.setId) ?? 0) + 1);
    }

    const sets = await this.prisma.set.findMany({
      select: { id: true, name: true, slug: true, series: true, totalCards: true },
      orderBy: { name: "asc" },
    });
    return sets.map((s) => {
      const owned = ownedBySet.get(s.id) ?? 0;
      const total = s.totalCards > 0 ? s.totalCards : 1;
      return {
        setId: s.id,
        setName: s.name,
        slug: s.slug,
        series: s.series,
        ownedCards: owned,
        totalCards: s.totalCards,
        completionPercentage: Math.round((owned / total) * 10000) / 100,
      };
    });
  }

  async setProgressFor(setId: string, userId: string): Promise<SetProgressDto | null> {
    const all = await this.setProgress(userId);
    return all.find((s) => s.setId === setId) ?? null;
  }

  // ---- Immutable activity stream (§32) ----

  async recordActivity(userId: string, data: {
    eventType: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<ActivityDto> {
    const row = await this.prisma.collectionActivity.create({
      data: {
        userId,
        eventType: data.eventType as any,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        metadata: (data.metadata as any) ?? undefined,
      },
    });
    return this.mapActivity(row);
  }

  async listActivity(userId: string, page: number, limit: number): Promise<{ items: ActivityDto[]; total: number }> {
    const where = { userId };
    const [rows, total] = await Promise.all([
      this.prisma.collectionActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.collectionActivity.count({ where }),
    ]);
    return { items: rows.map(this.mapActivity), total };
  }

  private mapActivity(row: any): ActivityDto {
    return {
      id: row.id,
      userId: row.userId,
      eventType: row.eventType,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
    };
  }
}
