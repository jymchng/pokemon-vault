import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationDto, NotificationPreferenceDto } from "./notifications.dto";

@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findForUser(
    userId: string,
    opts: { unreadOnly?: boolean; type?: string; page: number; limit: number },
  ): Promise<{ items: NotificationDto[]; total: number; unread: number }> {
    const where: any = { userId };
    if (opts.unreadOnly) where.readAt = null;
    if (opts.type) where.type = opts.type;
    const [rows, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return {
      items: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        type: r.type,
        title: r.title,
        body: r.body,
        readAt: r.readAt,
        metadata: (r.metadata as Record<string, unknown> | null) ?? null,
        createdAt: r.createdAt,
      })),
      total,
      unread,
    };
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    const res = await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count === 1;
  }

  async markAllRead(userId: string): Promise<number> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.count;
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    body?: string | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<NotificationDto> {
    const row = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        body: data.body ?? null,
        metadata: (data.metadata as any) ?? undefined,
      },
    });
    return {
      id: row.id,
      userId: row.userId,
      type: row.type,
      title: row.title,
      body: row.body,
      readAt: row.readAt,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      createdAt: row.createdAt,
    };
  }

  async getPreferences(userId: string): Promise<NotificationPreferenceDto> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    return {
      userId: row.userId,
      orderUpdates: row.orderUpdates,
      shippingUpdates: row.shippingUpdates,
      rewardAvailable: row.rewardAvailable,
      collectionMilestones: row.collectionMilestones,
      promotions: row.promotions,
      systemMessages: row.systemMessages,
      emailOptIn: row.emailOptIn,
    };
  }

  async updatePreferences(userId: string, data: Partial<Omit<NotificationPreferenceDto, "userId">>): Promise<NotificationPreferenceDto> {
    const row = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(data.orderUpdates !== undefined ? { orderUpdates: data.orderUpdates } : {}),
        ...(data.shippingUpdates !== undefined ? { shippingUpdates: data.shippingUpdates } : {}),
        ...(data.rewardAvailable !== undefined ? { rewardAvailable: data.rewardAvailable } : {}),
        ...(data.collectionMilestones !== undefined ? { collectionMilestones: data.collectionMilestones } : {}),
        ...(data.promotions !== undefined ? { promotions: data.promotions } : {}),
        ...(data.systemMessages !== undefined ? { systemMessages: data.systemMessages } : {}),
        ...(data.emailOptIn !== undefined ? { emailOptIn: data.emailOptIn } : {}),
      },
      create: { userId, ...data },
    });
    return {
      userId: row.userId,
      orderUpdates: row.orderUpdates,
      shippingUpdates: row.shippingUpdates,
      rewardAvailable: row.rewardAvailable,
      collectionMilestones: row.collectionMilestones,
      promotions: row.promotions,
      systemMessages: row.systemMessages,
      emailOptIn: row.emailOptIn,
    };
  }
}
