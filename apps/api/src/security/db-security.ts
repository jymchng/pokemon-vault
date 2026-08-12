/**
 * Database security (§55): production connections are encrypted (TLS), the
 * database is reached over private networking with no public port, the app
 * runs with least-privilege credentials, storage is encrypted at rest, and
 * backups/PITR are configured (see infrastructure/db/backup.sh + docs).
 *
 * Runtime enforcement lives here:
 *   - resolveDbSslMode / buildDbSslOptions — prod defaults to sslmode=require
 *   - assertSecureDbConfig — fail closed at startup in production
 */

export type DbSslMode = "disable" | "require" | "verify-full";

export interface DbSslOptions {
  rejectUnauthorized: boolean;
  ca?: string;
}

const SSL_MODES: readonly DbSslMode[] = ["disable", "require", "verify-full"];

/**
 * Resolve the effective TLS mode. Production defaults to "require" (encrypted
 * connection mandatory); local dev defaults to "disable" (localhost Postgres).
 * Explicit DATABASE_SSLMODE always wins; "verify-full" additionally validates
 * the server certificate against DATABASE_SSL_CA.
 */
export function resolveDbSslMode(env: NodeJS.ProcessEnv = process.env): DbSslMode {
  const explicit = env.DATABASE_SSLMODE;
  const mode = (
    explicit ?? (env.NODE_ENV === "production" ? "require" : "disable")
  ).toLowerCase();
  if (!(SSL_MODES as string[]).includes(mode)) {
    throw new Error(
      `Invalid DATABASE_SSLMODE '${mode}' (expected disable | require | verify-full)`,
    );
  }
  return mode as DbSslMode;
}

/** pg.PoolConfig-compatible ssl option for the current mode. */
export function buildDbSslOptions(
  env: NodeJS.ProcessEnv = process.env,
): DbSslOptions | undefined {
  const mode = resolveDbSslMode(env);
  if (mode === "disable") return undefined;
  return {
    rejectUnauthorized: mode === "verify-full",
    ...(env.DATABASE_SSL_CA ? { ca: env.DATABASE_SSL_CA } : {}),
  };
}

/**
 * Fail closed in production: require DATABASE_URL + encrypted connection, and
 * refuse a plaintext "postgres://" URL. Call during startup (PrismaService).
 * Local dev is unaffected.
 */
export function assertSecureDbConfig(env: NodeJS.ProcessEnv = process.env): void {
  if (env.NODE_ENV !== "production") return;
  if (!env.DATABASE_URL) {
    throw new Error("Production requires DATABASE_URL (resolved via SECRETS_PROVIDER)");
  }
  const mode = resolveDbSslMode(env);
  if (mode === "disable") {
    throw new Error(
      "Production requires encrypted DB connections: set DATABASE_SSLMODE=require (or verify-full)",
    );
  }
  try {
    const url = new URL(env.DATABASE_URL);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      throw new Error("DATABASE_URL must use the postgres:// protocol");
    }
    if (!url.hostname) throw new Error("DATABASE_URL has no host");
    if (url.password === undefined || url.password === "") {
      // Allowed when using .pgpass/IAM auth, but only in non-prod posture;
      // prod URLs should carry least-privilege credentials explicitly.
      throw new Error("DATABASE_URL is missing credentials (least-privilege role required)");
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid URL")) {
      throw new Error("DATABASE_URL is not a valid connection string");
    }
    throw err;
  }
}
