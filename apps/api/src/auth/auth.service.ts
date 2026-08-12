import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { hashPassword, verifyPassword } from "../common/password.policy";
import { EmailService } from "../email/email.service";
import { AbuseProtectionService } from "../common/abuse-protection.service";
import { AuthRepository } from "./auth.repository";
import {
  AuthResult,
  AuthUserRow,
  PublicUser,
  SessionInfo,
} from "./auth.types";
import { randomToken, sha256Hex, signJwt } from "./crypto";

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const ACCESS_TOKEN_TTL_SECONDS = envInt("ACCESS_TOKEN_TTL_SECONDS", 15 * 60); // 15 min
export const REFRESH_TOKEN_TTL_SECONDS = envInt("REFRESH_TOKEN_TTL_SECONDS", 30 * 24 * 60 * 60); // 30 days
export const SESSION_TTL_SECONDS = envInt("SESSION_TTL_SECONDS", 30 * 24 * 60 * 60); // 30 days
export const VERIFY_EMAIL_TTL_SECONDS = envInt("VERIFY_EMAIL_TTL_SECONDS", 24 * 60 * 60); // 24 h
export const PASSWORD_RESET_TTL_SECONDS = envInt("PASSWORD_RESET_TTL_SECONDS", 60 * 60); // 1 h

function toPublic(user: AuthUserRow): PublicUser {
  const { passwordHash: _ph, ...safe } = user;
  return safe as PublicUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly email: EmailService,
    private readonly abuse: AbuseProtectionService,
  ) {}

  private get jwtSecret(): string {
    const s = process.env.JWT_SECRET || process.env.JWT_REFRESH_SECRET;
    if (!s || s === "change-me") {
      throw new Error("JWT_SECRET must be set to a strong value");
    }
    return s;
  }

  private get refreshSecret(): string {
    const s = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
    if (!s || s === "change-me") {
      throw new Error("JWT_REFRESH_SECRET must be set to a strong value");
    }
    return s;
  }

  /** Issue a fresh access token for a session. */
  private async issueAccessToken(
    userId: string,
    sessionId: string,
  ): Promise<string> {
    return signJwt(
      { sub: userId, sessionId, jti: randomToken(16), type: "access" },
      this.jwtSecret,
      ACCESS_TOKEN_TTL_SECONDS,
    );
  }

  /**
   * Create a session + rotating refresh token (both hashed at rest) and return
   * the access token + user. `sessionToken` binds the session row to the
   * browser's session (stored hashed).
   */
  private async establishSession(
    user: AuthUserRow,
    meta: { device?: string | null; ip?: string | null; userAgent?: string | null },
  ): Promise<AuthResult> {
    const now = new Date();
    const sessionToken = randomToken();
    const session = await this.repo.createSession({
      userId: user.id,
      tokenHash: sha256Hex(sessionToken),
      device: meta.device ?? null,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
      expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
    });

    const refreshToken = randomToken();
    await this.repo.createRefreshToken({
      userId: user.id,
      sessionId: session.id,
      tokenHash: sha256Hex(refreshToken),
      familyId: randomToken(16),
      expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    });

    return {
      user: toPublic(user),
      accessToken: await this.issueAccessToken(user.id, session.id),
      refreshToken,
      sessionId: session.id,
    };
  }

  // ---- Registration ----

  async register(
    input: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      avatarUrl?: string;
    },
    meta: { device?: string; ip?: string; userAgent?: string },
  ): Promise<AuthResult> {
    const existing = await this.repo.findUserByEmailWithPassword(input.email);
    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }
    const passwordHash = await hashPassword(input.password);
    const created = await this.repo.createUser({
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null,
    });

    // Issue an email-verification token (single-use, 24 h).
    const verifyToken = randomToken();
    await this.repo.createOneTimeToken({
      userId: created.id,
      purpose: "EMAIL_VERIFICATION",
      tokenHash: sha256Hex(verifyToken),
      expiresAt: new Date(Date.now() + VERIFY_EMAIL_TTL_SECONDS * 1000),
    });

    // Auto-login: fresh session + refresh family (session-fixation safe).
    const row = await this.repo.findUserById(created.id);
    if (!row) throw new NotFoundException("User not found");
    await this.repo.touchLastLogin(row.id);
    // Queue welcome email (async; never blocks registration).
    await this.email.sendWelcome(input.email, input.displayName ?? undefined).catch(() => {});
    return this.establishSession(row, meta);
  }

  // ---- Login ----

  async login(
    email: string,
    password: string,
    meta: { device?: string; ip?: string; userAgent?: string },
  ): Promise<AuthResult> {
    // §90: brute-force protection — per-IP sliding window (extension point:
    // add per-account rules by using `login:${email}` as the actorKey).
    if (meta.ip) {
      const blocked = await this.abuse.checkAndRecord({
        scope: "login", actorKey: meta.ip, limit: 10, windowSeconds: 300,
      });
      if (blocked) throw new HttpException("Too many login attempts — try again later", HttpStatus.TOO_MANY_REQUESTS);
    }
    const user = await this.repo.findUserByEmailWithPassword(email.toLowerCase());
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException("Invalid credentials");
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active");
    }
    await this.repo.touchLastLogin(user.id);
    return this.establishSession(user, meta);
  }

  // ---- Refresh (rotation with reuse/theft detection) ----

  /**
   * Rotate a refresh token. Each refresh issues a NEW refresh token and revokes
   * the presented one (single-use). If a revoked/expired token is replayed, the
   * whole family + session is revoked (token-theft response).
   */
  async refresh(refreshToken: string): Promise<AuthResult> {
    const hash = sha256Hex(refreshToken);
    const stored = await this.repo.findRefreshTokenByHash(hash);
    if (!stored) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    const now = Date.now();
    const revokedOrExpired =
      stored.revokedAt !== null || stored.expiresAt.getTime() < now;

    if (revokedOrExpired) {
      // Replay of an already-rotated/expired token: treat as theft.
      await this.repo.revokeFamily(stored.familyId);
      if (stored.sessionId) await this.repo.revokeSession(stored.sessionId);
      throw new UnauthorizedException("Refresh token reuse detected");
    }

    const user = await this.repo.findUserById(stored.userId);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account unavailable");
    }

    // Rotate: revoke old, issue new (same family + session), touch session.
    const newToken = randomToken();
    await this.repo.revokeRefreshToken(stored.id);
    await this.repo.createRefreshToken({
      userId: stored.userId,
      sessionId: stored.sessionId!,
      tokenHash: sha256Hex(newToken),
      familyId: stored.familyId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
    });
    if (stored.sessionId) await this.repo.touchSessionLastSeen(stored.sessionId);

    return {
      user: toPublic(user),
      accessToken: await this.issueAccessToken(user.id, stored.sessionId!),
      refreshToken: newToken,
      sessionId: stored.sessionId!,
    };
  }

  // ---- Logout ----

  async logout(refreshToken: string): Promise<void> {
    const hash = sha256Hex(refreshToken);
    const stored = await this.repo.findRefreshTokenByHash(hash);
    if (!stored) return; // idempotent
    await this.repo.revokeFamily(stored.familyId);
    if (stored.sessionId) await this.repo.revokeSession(stored.sessionId);
  }

  // ---- Me (access-token check) ----

  async me(userId: string, sessionId: string): Promise<{ user: PublicUser; session: SessionInfo }> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new UnauthorizedException("Session is no longer valid");
    }
    if (session.revokedAt || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Session is no longer valid");
    }
    const user = await this.repo.findUserById(userId);
    if (!user || user.status !== "ACTIVE") {
      throw new UnauthorizedException("Account unavailable");
    }
    return { user: toPublic(user), session: session as SessionInfo };
  }

  // ---- Email verification ----

  async verifyEmail(token: string): Promise<void> {
    const hash = sha256Hex(token);
    const stored = await this.repo.findOneTimeTokenByHash(hash);
    if (!stored) throw new BadRequestException("Invalid token");
    if (stored.purpose !== "EMAIL_VERIFICATION") {
      throw new BadRequestException("Invalid token");
    }
    if (stored.consumedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Token expired or already used");
    }
    const consumed = await this.repo.consumeOneTimeToken(stored.id);
    if (consumed !== 1) throw new BadRequestException("Token already used");
    await this.repo.markEmailVerified(stored.userId);
  }

  // ---- Password reset ----

  /** Always returns success (no user enumeration); token issued only if user exists. */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.repo.findUserByEmailWithPassword(email.toLowerCase());
    if (!user) return;
    const token = randomToken();
    await this.repo.createOneTimeToken({
      userId: user.id,
      purpose: "PASSWORD_RESET",
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hash = sha256Hex(token);
    const stored = await this.repo.findOneTimeTokenByHash(hash);
    if (!stored) throw new BadRequestException("Invalid token");
    if (stored.purpose !== "PASSWORD_RESET") {
      throw new BadRequestException("Invalid token");
    }
    if (stored.consumedAt || stored.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Token expired or already used");
    }
    const consumed = await this.repo.consumeOneTimeToken(stored.id);
    if (consumed !== 1) throw new BadRequestException("Token already used");

    const passwordHash = await hashPassword(newPassword);
    await this.repo.updatePassword(stored.userId, passwordHash);
    // Security: revoke every session + refresh token after a password change.
    await this.repo.revokeAllSessionsForUser(stored.userId);
    await this.repo.revokeAllRefreshTokensForUser(stored.userId);
  }

  // ---- Session / device management ----

  async listSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.repo.listSessionsForUser(userId);
    return sessions.map((s) => ({
      ...s,
      revokedAt: s.revokedAt ?? null,
      lastSeenAt: s.lastSeenAt ?? null,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.repo.findSessionById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException("Session not found");
    }
    await this.repo.revokeSession(sessionId);
    await this.repo.revokeRefreshTokensForSession(sessionId);
  }

  /** Revoke every session for a user except the current one. */
  async revokeOtherSessions(userId: string, currentSessionId: string): Promise<void> {
    const sessions = await this.repo.listSessionsForUser(userId);
    for (const s of sessions) {
      if (s.id !== currentSessionId && !s.revokedAt) {
        await this.repo.revokeSession(s.id);
        await this.repo.revokeRefreshTokensForSession(s.id);
      }
    }
  }
}
