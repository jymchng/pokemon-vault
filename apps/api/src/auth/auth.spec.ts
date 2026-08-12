import { Test } from "@nestjs/testing";
import {
  ConflictException,
  UnauthorizedException,
} from "@nestjs/common";
import * as argon2 from "argon2";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuthRepository } from "./auth.repository";
import { AuthUserRow } from "./auth.types";
import { sha256Hex, signJwt, verifyJwt } from "./crypto";
import { EmailService } from "../email/email.service";
import { CorrelationService } from "../common/correlation.service";
import { AbuseProtectionService } from "../common/abuse-protection.service";

const fakeEmail = { sendWelcome: async () => ({}) } as unknown as EmailService;

/** In-memory fake repository exercising the token/rotation contracts. */
class FakeAuthRepository {
  users: Map<string, AuthUserRow> = new Map();
  sessions: Map<string, any> = new Map();
  refresh: Map<string, any> = new Map();
  oneTime: Map<string, any> = new Map();
  seq = 0;

  async findUserByEmailWithPassword(email: string) {
    for (const u of this.users.values()) if (u.email === email) return u;
    return null;
  }
  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }
  async createUser(data: any) {
    const user: any = {
      id: `u${++this.seq}`,
      email: data.email,
      emailVerified: false,
      passwordHash: data.passwordHash,
      firstName: data.firstName ?? null,
      lastName: data.lastName ?? null,
      displayName: data.displayName ?? null,
      avatarUrl: data.avatarUrl ?? null,
      status: "ACTIVE",
      role: "CUSTOMER",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLoginAt: null,
    };
    this.users.set(user.id, user);
    return { id: user.id };
  }
  async markEmailVerified(userId: string) {
    const u = this.users.get(userId)!;
    u.emailVerified = true;
  }
  async updatePassword(userId: string, passwordHash: string) {
    this.users.get(userId)!.passwordHash = passwordHash;
  }
  async touchLastLogin(userId: string) {
    this.users.get(userId)!.lastLoginAt = new Date();
  }
  async createSession(data: any) {
    const s = { id: `s${++this.seq}`, ...data, revokedAt: null, lastSeenAt: null, createdAt: new Date() };
    this.sessions.set(s.id, s);
    return { id: s.id };
  }
  async findSessionById(id: string) {
    return this.sessions.get(id) ?? null;
  }
  async listSessionsForUser(userId: string) {
    return [...this.sessions.values()].filter((s) => s.userId === userId);
  }
  async revokeSession(id: string) {
    const s = this.sessions.get(id);
    if (s) s.revokedAt = new Date();
  }
  async revokeAllSessionsForUser(userId: string) {
    for (const s of this.sessions.values()) if (s.userId === userId) s.revokedAt = new Date();
  }
  async touchSessionLastSeen(id: string) {
    const s = this.sessions.get(id);
    if (s) s.lastSeenAt = new Date();
  }
  async createRefreshToken(data: any) {
    this.refresh.set(data.tokenHash, { id: `r${++this.seq}`, ...data, revokedAt: null, createdAt: new Date() });
  }
  async findRefreshTokenByHash(tokenHash: string) {
    return this.refresh.get(tokenHash) ?? null;
  }
  async revokeRefreshToken(id: string) {
    const r = [...this.refresh.values()].find((x) => x.id === id);
    if (r) r.revokedAt = new Date();
  }
  async revokeFamily(familyId: string) {
    for (const r of this.refresh.values()) if (r.familyId === familyId) r.revokedAt = new Date();
  }
  async revokeAllRefreshTokensForUser(userId: string) {
    for (const r of this.refresh.values()) if (r.userId === userId) r.revokedAt = new Date();
  }
  async revokeRefreshTokensForSession(sessionId: string) {
    for (const r of this.refresh.values()) if (r.sessionId === sessionId) r.revokedAt = new Date();
  }
  async createOneTimeToken(data: any) {
    this.oneTime.set(data.tokenHash, { id: `t${++this.seq}`, ...data, consumedAt: null, createdAt: new Date() });
  }
  async findOneTimeTokenByHash(tokenHash: string) {
    return this.oneTime.get(tokenHash) ?? null;
  }
  async consumeOneTimeToken(id: string) {
    const t = [...this.oneTime.values()].find((x) => x.id === id);
    if (!t || t.consumedAt) return 0;
    t.consumedAt = new Date();
    return 1;
  }
}

async function makeService(repo: FakeAuthRepository) {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      AuthService,
      { provide: AuthRepository, useValue: repo },
      { provide: EmailService, useValue: fakeEmail },
      CorrelationService,
      { provide: AbuseProtectionService, useValue: { checkAndRecord: async () => false, record: async () => {}, count: async () => 0 } },
    ],
  }).compile();
  return { service: moduleRef.get(AuthService), ctrl: moduleRef.get(AuthController) };
}

const META = { device: "unit-test", ip: "127.0.0.1", userAgent: "vitest" };

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-1234567890";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-1234567890";
});

it("auth: register creates user + session and returns no passwordHash", async () => {
  const repo = new FakeAuthRepository();
  const { service } = await makeService(repo);
  const res = await service.register(
    { email: "New@Example.com", password: "Sup3rSecret!" },
    META,
  );
  expect(res.user.email).toBe("new@example.com"); // emails normalized to lowercase
  expect(res.accessToken).toBeTruthy();
  expect(res.refreshToken).toBeTruthy();
  expect("passwordHash" in res.user).toBe(false);
  expect(repo.sessions.size).toBe(1);
  expect(repo.refresh.size).toBe(1);
});

it("auth: register rejects duplicate email", async () => {
  const repo = new FakeAuthRepository();
  const { service } = await makeService(repo);
  await service.register({ email: "dup@example.com", password: "Sup3rSecret!" }, META);
  await expect(
    service.register({ email: "dup@example.com", password: "Sup3rSecret!" }, META),
  ).rejects.toBeInstanceOf(ConflictException);
});

it("auth: login verifies Argon2id hash, rejects wrong password", async () => {
  const repo = new FakeAuthRepository();
  const { service } = await makeService(repo);
  await service.register({ email: "a@example.com", password: "Sup3rSecret!" }, META);
  const ok = await service.login("a@example.com", "Sup3rSecret!", META);
  expect(ok.user.email).toBe("a@example.com");
  await expect(service.login("a@example.com", "wrong-password", META)).rejects.toBeInstanceOf(
    UnauthorizedException,
  );
});

it("auth: refresh rotates token (old one becomes replayable → theft response)", async () => {
  const repo = new FakeAuthRepository();
  const { service } = await makeService(repo);
  const first = await service.register({ email: "r@example.com", password: "Sup3rSecret!" }, META);
  const second = await service.refresh(first.refreshToken);
  expect(second.refreshToken).not.toBe(first.refreshToken);
  expect(repo.refresh.size).toBe(2);
  // Replaying the ORIGINAL (now-revoked) token must trigger family revocation.
  await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  // And the rotated token is now also dead (family revoked).
  await expect(service.refresh(second.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
});

it("auth: logout revokes session + refresh family", async () => {
  const repo = new FakeAuthRepository();
  const { service } = await makeService(repo);
  const res = await service.register({ email: "l@example.com", password: "Sup3rSecret!" }, META);
  await service.logout(res.refreshToken);
  await expect(service.refresh(res.refreshToken)).rejects.toBeInstanceOf(UnauthorizedException);
  const session = repo.sessions.get(res.sessionId);
  expect(session.revokedAt).not.toBeNull();
});

it("auth: verifyEmail consumes single-use token and marks verified", async () => {
  const repo = new FakeAuthRepository();
  const { service } = await makeService(repo);
  const res = await service.register({ email: "v@example.com", password: "Sup3rSecret!" }, META);
  // Construct a real raw token + its row the way the service would.
  const raw = "raw-verify-token-0000000000000000";
  repo.oneTime.set(sha256Hex(raw), {
    id: "t-verify",
    userId: res.user.id,
    purpose: "EMAIL_VERIFICATION",
    tokenHash: sha256Hex(raw),
    expiresAt: new Date(Date.now() + 3600e3),
    consumedAt: null,
    createdAt: new Date(),
  });
  await service.verifyEmail(raw);
  expect(repo.users.get(res.user.id)!.emailVerified).toBe(true);
  // Single-use: second attempt fails.
  await expect(service.verifyEmail(raw)).rejects.toBeInstanceOf(Error);
});

it("auth: resetPassword rotates hash and revokes all sessions", async () => {
  const repo = new FakeAuthRepository();
  const { service } = await makeService(repo);
  const res = await service.register({ email: "p@example.com", password: "Sup3rSecret!" }, META);
  const raw = "raw-reset-token-00000000000000000";
  repo.oneTime.set(sha256Hex(raw), {
    id: "t-reset",
    userId: res.user.id,
    purpose: "PASSWORD_RESET",
    tokenHash: sha256Hex(raw),
    expiresAt: new Date(Date.now() + 3600e3),
    consumedAt: null,
    createdAt: new Date(),
  });
  await service.resetPassword(raw, "NewPassw0rd!");
  const user = repo.users.get(res.user.id)!;
  expect(await argon2.verify(user.passwordHash, "NewPassw0rd!")).toBe(true);
  expect(repo.sessions.get(res.sessionId).revokedAt).not.toBeNull();
});

it("auth: me returns current user + session info, no hash", async () => {
  const repo = new FakeAuthRepository();
  const { service } = await makeService(repo);
  const res = await service.register({ email: "m@example.com", password: "Sup3rSecret!" }, META);
  const me = await service.me(res.user.id, res.sessionId);
  expect(me.user.email).toBe("m@example.com");
  expect(me.session.id).toBe(res.sessionId);
  expect("passwordHash" in me.user).toBe(false);
});

it("auth: signJwt round-trips and rejects tampered tokens", () => {
  const token = signJwt({ sub: "u1", sessionId: "s1", type: "access" }, process.env.JWT_SECRET!, 300);
  const [h, p, sig] = token.split(".");
  const tampered = `${h}.${p.slice(0, -2)}xx.${sig}`;
  const decoded = verifyJwt(token, process.env.JWT_SECRET!);
  expect(decoded?.sub).toBe("u1");
  expect(verifyJwt(tampered, process.env.JWT_SECRET!)).toBeNull();
  expect(verifyJwt(token, "wrong-secret")).toBeNull();
});
