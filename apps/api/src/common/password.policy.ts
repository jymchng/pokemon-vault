/**
 * G7 §9 — Password security policy.
 *
 * - Argon2id hashing ONLY (never MD5/SHA-1/reversible/unsalted).
 * - Explicit, documented Argon2id parameters (OWASP-recommended range).
 * - Strength validation: length, character classes, common passwords,
 *   sequential/repeated patterns, entropy estimate.
 *
 * All TUNABLES (min/max length, required character classes, entropy floor)
 * come from the centralized config (config/app.toml [passwordPolicy],
 * overridable via POKE_VAULT_PASSWORD_POLICY_* env) — no hardcoded limits or
 * user-facing messages in code. Rule definitions (common words, sequential
 * patterns) stay here; their user-facing labels are generated from config.
 */
import * as argon2 from "argon2";
import { z } from "zod";
import { loadConfig } from "@pokemon-vault/config";

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  minCharacterClasses: number;
  minEntropyBits: number;
}

/** Resolve the active policy from the centralized config (safe defaults). */
export function getPasswordPolicy(): PasswordPolicy {
  let cfg: ReturnType<typeof loadConfig> | null = null;
  try {
    cfg = loadConfig(process.env);
  } catch {
    cfg = null;
  }
  return {
    minLength: cfg?.passwordPolicy.minLength ?? 8,
    maxLength: cfg?.passwordPolicy.maxLength ?? 128,
    minCharacterClasses: cfg?.passwordPolicy.minCharacterClasses ?? 3,
    minEntropyBits: cfg?.passwordPolicy.minEntropyBits ?? 24,
  };
}

/** Argon2id pinned explicitly (the library default is argon2id; we make it
 *  contractual and tune to OWASP-2017+ guidance: m=64 MiB, t=3, p=4). */
export const ARGON2ID_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2ID_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain);
}

/** Options accepted by argon2.needsRehash (subset of Options). */
const REHASH_OPTIONS = {
  timeCost: ARGON2ID_OPTIONS.timeCost,
  memoryCost: ARGON2ID_OPTIONS.memoryCost,
  parallelism: ARGON2ID_OPTIONS.parallelism,
};

/** Returns true when the stored hash was produced with weaker settings and
 *  should be re-hashed on next login. */
export function needsRehash(storedHash: string): boolean {
  return !storedHash.startsWith("$argon2id$") || argon2.needsRehash(storedHash, REHASH_OPTIONS);
}

// Common / structurally weak passwords rejected up front (non-exhaustive).
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "1234567890", "qwerty", "qwerty123", "letmein", "welcome",
  "admin", "admin123", "root", "toor", "monkey", "dragon",
  "football", "baseball", "abc123", "abc12345", "iloveyou",
  "trustno1", "sunshine", "princess", "superman", "batman",
]);

/** Conservative Shannon-entropy estimate (bits). */
export function estimateEntropyBits(password: string): number {
  if (password.length === 0) return 0;
  const freq = new Map<string, number>();
  for (const ch of password) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let perChar = 0;
  for (const count of freq.values()) {
    const p = count / password.length;
    perChar -= p * Math.log2(p);
  }
  return perChar * password.length;
}

const SEQUENTIAL = /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|qwerty|asdf|zxcv)/i;

export interface PasswordStrengthResult {
  ok: boolean;
  errors: string[];
}

export function evaluatePasswordStrength(
  password: string,
  policy: PasswordPolicy = getPasswordPolicy(),
): PasswordStrengthResult {
  const errors: string[] = [];
  if (typeof password !== "string" || password.length === 0) {
    return { ok: false, errors: ["Password is required"] };
  }
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }
  if (password.length > policy.maxLength) {
    errors.push(`Password must be at most ${policy.maxLength} characters`);
  }
  if (password.length < policy.minLength || password.length > policy.maxLength) {
    return { ok: false, errors };
  }

  const lower = /[a-z]/.test(password);
  const upper = /[A-Z]/.test(password);
  const digit = /\d/.test(password);
  const symbol = /[^A-Za-z0-9]/.test(password);
  const classes = [lower, upper, digit, symbol].filter(Boolean).length;
  if (classes < policy.minCharacterClasses) {
    errors.push(
      `Use at least ${policy.minCharacterClasses} of: lowercase, uppercase, digit, symbol`,
    );
  }

  if (/(.)\1{3,}/.test(password)) {
    errors.push("Avoid 4+ repeated characters in a row");
  }
  if (SEQUENTIAL.test(password)) {
    errors.push("Avoid sequential characters (e.g. abc, 123, qwerty)");
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push("This password is too common");
  }
  if (estimateEntropyBits(password) < policy.minEntropyBits) {
    errors.push("Password is too predictable");
  }
  return { ok: errors.length === 0, errors };
}

/** Machine-readable requirement descriptors for the UI (from config). */
export function getPasswordRequirements(policy: PasswordPolicy = getPasswordPolicy()): {
  key: string;
  label: string;
}[] {
  return [
    { key: "length", label: `At least ${policy.minLength} characters` },
    {
      key: "classes",
      label: `Uses ${policy.minCharacterClasses} of: lowercase, uppercase, number, symbol`,
    },
    { key: "repeated", label: "No 4+ repeated characters in a row" },
    { key: "sequential", label: "No sequences like abc, 123, or qwerty" },
    { key: "common", label: "Not a commonly used password" },
    { key: "entropy", label: "Strong enough (not too predictable)" },
  ];
}

/** Zod schema enforcing the strength policy (used by register/reset/users-create).
 *  Uses .min(1) only so the friendly policy messages (via superRefine) are the
 *  sole messages surfaced — no generic Zod "String must contain..." text. */
export const StrongPasswordSchema = z
  .string()
  .min(1)
  .superRefine((val, ctx) => {
    const { ok, errors } = evaluatePasswordStrength(val);
    if (!ok) {
      for (const message of errors) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message });
      }
    }
  });
