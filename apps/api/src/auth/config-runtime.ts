import { loadConfig } from "@pokemon-vault/config";

/**
 * Resolve the JWT verification secret (G54): prefer POKE_VAULT_JWT_SECRET env,
 * else fall back to the resolved config (dev fallback in non-prod; fail-closed
 * in prod via loadConfig validation). Guards use this so token verification
 * works in the dev environment without requiring the secret to be exported.
 */
export function resolveJwtSecret(): string {
  const fromEnv =
    process.env.POKE_VAULT_JWT_SECRET || process.env.POKE_VAULT_JWT_REFRESH_SECRET;
  if (fromEnv && fromEnv !== "change-me") return fromEnv;
  try {
    const cfg = loadConfig(process.env);
    return cfg.jwtSecret;
  } catch {
    return "";
  }
}
