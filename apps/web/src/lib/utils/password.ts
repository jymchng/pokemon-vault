/**
 * Client-side password strength validation.
 *
 * NOTHING user-facing is hardcoded here — the requirement list (keys + labels)
 * and the policy numbers come from the backend (GET /api/v1/auth/password-policy),
 * which reads config/app.toml [passwordPolicy]. This module only computes each
 * requirement's met/unmet state for the typed password.
 */

export interface PasswordRequirement {
  key: string;
  label: string;
  met: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  minCharacterClasses: number;
  minEntropyBits: number;
  requirements: { key: string; label: string }[];
}

const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "12345678", "123456789",
  "1234567890", "qwerty", "qwerty123", "letmein", "welcome",
  "admin", "admin123", "root", "toor", "monkey", "dragon",
  "football", "baseball", "abc123", "abc12345", "iloveyou",
  "trustno1", "sunshine", "princess", "superman", "batman",
]);

const SEQUENTIAL =
  /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|qwerty|asdf|zxcv)/i;

function estimateEntropyBits(password: string): number {
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

/** Compute met/unmet for each backend-supplied requirement. */
export function validatePassword(
  password: string,
  policy: PasswordPolicy,
): { ok: boolean; requirements: PasswordRequirement[] } {
  const metByKey: Record<string, boolean> = {
    length: password.length >= policy.minLength,
    classes: (() => {
      const classes = [
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /\d/.test(password),
        /[^A-Za-z0-9]/.test(password),
      ].filter(Boolean).length;
      return classes >= policy.minCharacterClasses;
    })(),
    repeated: !/(.)\1{3,}/.test(password),
    sequential: !SEQUENTIAL.test(password),
    common: !COMMON_PASSWORDS.has(password.toLowerCase()),
    entropy: estimateEntropyBits(password) >= policy.minEntropyBits,
  };

  const requirements = (policy.requirements ?? []).map((r) => ({
    key: r.key,
    label: r.label,
    met: metByKey[r.key] ?? false,
  }));

  return { ok: requirements.every((r) => r.met), requirements };
}
