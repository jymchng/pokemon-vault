/**
 * Shared auth types. Password hashes NEVER cross the HTTP boundary —
 * repository auth lookups return full rows for verification only.
 */

export interface AuthUserRow {
  id: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

/** Public user projection — mirrors UsersDto, never contains passwordHash. */
export interface PublicUser {
  id: string;
  email: string;
  emailVerified: boolean;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  status: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface SessionInfo {
  id: string;
  device: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date | null;
  revokedAt: Date | null;
  current?: boolean;
}

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

export interface AccessTokenPayload {
  sub: string; // userId
  sessionId: string;
  jti: string;
  type: "access";
  iat: number;
  exp: number;
  [key: string]: unknown;
}

export type OneTimeTokenPurpose = "EMAIL_VERIFICATION" | "PASSWORD_RESET";
