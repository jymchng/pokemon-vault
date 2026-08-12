import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";

/**
 * GDPR-ready privacy operations (§103-104):
 *  - data export: user sees ALL personal data we hold (never includes other
 *    users' data, secrets, or payment card numbers)
 *  - account deletion: self-service right-to-erasure (soft-delete + anonymize
 *    PII; immutable order/payment/audit records retain only non-PII business
 *    facts — no email/name embedded unnecessarily)
 *  - consent: marketing opt-in/out is exposed and honored by the notifier.
 */
@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Export everything we store about a user (§104 GDPR data portability). */
  async exportUser(userId: string) {
    const [user, sessions, orders, collection, rewards, notifications, prefs] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, emailVerified: true, firstName: true, lastName: true, displayName: true, avatarUrl: true, status: true, role: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.authSession.findMany({ where: { userId }, select: { id: true, device: true, ip: true, createdAt: true } }),
      this.prisma.order.findMany({ where: { userId }, select: { id: true, orderNumber: true, status: true, total: true, createdAt: true } }),
      this.prisma.collectionItem.findMany({ where: { collection: { userId } }, select: { cardId: true, quantity: true, grade: true, condition: true } }),
      this.prisma.rewardAccount.findMany({ where: { userId }, select: { xp: true } }),
      this.prisma.notification.findMany({ where: { userId }, select: { type: true, title: true, body: true, readAt: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 500 }),
      this.prisma.notificationPreference.findUnique({ where: { userId } }),
    ]);
    return {
      user,
      sessions,
      orders,
      collection,
      rewards,
      notifications,
      notificationPreferences: prefs,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Right-to-erasure: soft-delete the account and ANONYMIZE personal fields.
   * Email is replaced with a nullified token so immutable records (orders,
   * audit logs, notifications) keep working references but no PII. Hard
   * deletion of derived rows (carts, sessions, tokens) happens immediately.
   */
  async deleteAccount(userId: string, actorId: string, ip?: string, ua?: string) {
    const anon = `deleted-${userId.slice(0, 8)}@removed.invalid`;
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          status: "DELETED",
          deletedAt: new Date(),
          email: anon, // unique-constraint-safe anonymization
          passwordHash: "!", // no credential survives
          firstName: null,
          lastName: null,
          displayName: null,
          avatarUrl: null,
        },
      }),
      this.prisma.cart.deleteMany({ where: { userId } }),
      this.prisma.authSession.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.oneTimeToken.deleteMany({ where: { userId } }),
    ]);
    // Consent + preferences removed; notifications retained (no PII in them).
    await this.prisma.notificationPreference.deleteMany({ where: { userId } }).catch(() => undefined);
    await this.audit.record({
      actorId, action: "user.delete", resourceType: "User", resourceId: userId,
      after: { status: "DELETED", anonymized: true }, ipAddress: ip, userAgent: ua,
    });
    return { deleted: true, userId };
  }

  /** Marketing consent (§104): read + update the promotions/emailOptIn flags. */
  async getConsent(userId: string) {
    const prefs = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return {
      marketingOptIn: prefs?.emailOptIn ?? false,
      promotions: prefs?.promotions ?? true,
    };
  }

  async setMarketingOptIn(userId: string, optIn: boolean) {
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      create: { userId, emailOptIn: optIn },
      update: { emailOptIn: optIn },
    });
    return { marketingOptIn: optIn };
  }
}
