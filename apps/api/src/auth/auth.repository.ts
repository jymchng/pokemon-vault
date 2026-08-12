import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthUserRow, OneTimeTokenPurpose, SessionInfo } from "./auth.types";

const SAFE_SELECT = {
  id: true,
  email: true,
  emailVerified: true,
  firstName: true,
  lastName: true,
  displayName: true,
  avatarUrl: true,
  status: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
  // passwordHash deliberately excluded — never returned to clients.
} as const;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Users ----

  /** Auth-only lookup: returns the full row INCLUDING passwordHash. */
  async findUserByEmailWithPassword(email: string): Promise<AuthUserRow | null> {
    return this.prisma.user.findUnique({ where: { email } }) as Promise<AuthUserRow | null>;
  }

  async findUserById(id: string): Promise<AuthUserRow | null> {
    return this.prisma.user.findUnique({ where: { id } }) as Promise<AuthUserRow | null>;
  }

  async createUser(data: {
    email: string;
    passwordHash: string;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  }) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        displayName: data.displayName ?? null,
        avatarUrl: data.avatarUrl ?? null,
      },
      select: SAFE_SELECT,
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async touchLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  // ---- Sessions ----

  async createSession(data: {
    userId: string;
    tokenHash: string;
    device?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    expiresAt: Date;
  }): Promise<{ id: string }> {
    return this.prisma.authSession.create({
      data: {
        userId: data.userId,
        token: data.tokenHash,
        device: data.device ?? null,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
        expiresAt: data.expiresAt,
      },
      select: { id: true },
    });
  }

  async findSessionById(id: string) {
    return this.prisma.authSession.findUnique({ where: { id } });
  }

  async listSessionsForUser(userId: string): Promise<SessionInfo[]> {
    return this.prisma.authSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }) as Promise<SessionInfo[]>;
  }

  async revokeSession(id: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllSessionsForUser(userId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async touchSessionLastSeen(id: string): Promise<void> {
    await this.prisma.authSession.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    });
  }

  // ---- Refresh tokens (opaque, hashed at rest, rotating families) ----

  async createRefreshToken(data: {
    userId: string;
    sessionId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  async findRefreshTokenByHash(tokenHash: string) {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke every token in a family (theft response) plus its session. */
  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllRefreshTokensForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeRefreshTokensForSession(sessionId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---- One-time tokens (email verification / password reset) ----

  async createOneTimeToken(data: {
    userId: string;
    purpose: OneTimeTokenPurpose;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.prisma.oneTimeToken.create({ data });
  }

  async findOneTimeTokenByHash(tokenHash: string) {
    return this.prisma.oneTimeToken.findUnique({ where: { tokenHash } });
  }

  /** Atomically consume a one-time token (single-use). Returns affected count. */
  async consumeOneTimeToken(id: string): Promise<number> {
    const res = await this.prisma.oneTimeToken.updateMany({
      where: { id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    return res.count;
  }
}
