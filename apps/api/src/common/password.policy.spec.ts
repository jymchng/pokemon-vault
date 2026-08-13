import {
  ARGON2ID_OPTIONS,
  StrongPasswordSchema,
  estimateEntropyBits,
  evaluatePasswordStrength,
  getPasswordPolicy,
  getPasswordRequirements,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "./password.policy";

describe("G7 password security policy", () => {
  it("hashes with Argon2id (never MD5/SHA-1/plaintext)", async () => {
    const hash = await hashPassword("Sup3rSecret!");
    expect(hash.startsWith("$argon2id$v=19$m=65536,t=3,p=4")).toBe(true);
    expect(hash).not.toContain("Sup3rSecret!");
    expect(hash).not.toMatch(/^(md5|sha1|sha256)/i);
    expect(await verifyPassword(hash, "Sup3rSecret!")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });

  it("pins Argon2id type and OWASP-range params explicitly", () => {
    expect(ARGON2ID_OPTIONS.type).toBe(2); // argon2.argon2id
    expect(ARGON2ID_OPTIONS.memoryCost).toBeGreaterThanOrEqual(19456);
    expect(ARGON2ID_OPTIONS.timeCost).toBeGreaterThanOrEqual(2);
    expect(ARGON2ID_OPTIONS.parallelism).toBeGreaterThanOrEqual(1);
  });

  it("detects weaker/legacy hashes via needsRehash", () => {
    expect(needsRehash("$argon2i$v=19$m=65536,t=3,p=4$...$...")).toBe(true);
    expect(needsRehash("$argon2id$v=19$m=65536,t=3,p=4$abc$def")).toBe(false);
    expect(needsRehash("plaintext")).toBe(true);
  });

  it("accepts a strong password", () => {
    const res = evaluatePasswordStrength("Sup3rSecret!2024");
    expect(res.ok).toBe(true);
    expect(res.errors).toEqual([]);
  });

  it("rejects too-short and too-long passwords", () => {
    expect(evaluatePasswordStrength("Ab1!").ok).toBe(false);
    expect(evaluatePasswordStrength("A".repeat(200)).ok).toBe(false);
  });

  it("rejects passwords lacking 3 character classes", () => {
    const res = evaluatePasswordStrength("abcdefgh");
    expect(res.ok).toBe(false);
    expect(res.errors.join()).toMatch(/3 of/);
  });

  it("rejects common, sequential, and repeated passwords", () => {
    expect(evaluatePasswordStrength("password1").ok).toBe(false); // common
    expect(evaluatePasswordStrength("abc12345").ok).toBe(false); // sequential + common
    expect(evaluatePasswordStrength("aaaa1234").ok).toBe(false); // repeated
  });

  it("rejects predictable low-entropy passwords", () => {
    const res = evaluatePasswordStrength("aaaaAAAA");
    expect(res.ok).toBe(false);
    expect(estimateEntropyBits("aaaaaaaa")).toBeLessThan(24);
  });

  it("StrongPasswordSchema enforces the policy through zod", () => {
    expect(StrongPasswordSchema.safeParse("Sup3rSecret!2024").success).toBe(true);
    const weak = StrongPasswordSchema.safeParse("password1");
    expect(weak.success).toBe(false);
    if (!weak.success) {
      expect(weak.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("reads the policy from config (config/app.toml [passwordPolicy])", () => {
    const policy = getPasswordPolicy();
    expect(policy.minLength).toBe(8);
    expect(policy.maxLength).toBe(128);
    expect(policy.minCharacterClasses).toBe(3);
    expect(policy.minEntropyBits).toBe(24);
  });

  it("builds user-facing requirement labels from the policy (no hardcoded numbers)", () => {
    const policy = getPasswordPolicy();
    const reqs = getPasswordRequirements(policy);
    expect(reqs.find((r) => r.key === "length")?.label).toBe(
      `At least ${policy.minLength} characters`,
    );
    expect(reqs.find((r) => r.key === "classes")?.label).toContain(
      `${policy.minCharacterClasses} of`,
    );
    expect(reqs.map((r) => r.key)).toEqual([
      "length", "classes", "repeated", "sequential", "common", "entropy",
    ]);
  });

  it("evaluator honors a custom policy (config-driven limits)", () => {
    const strict = { minLength: 8, maxLength: 64, minCharacterClasses: 4, minEntropyBits: 40 };
    // 3 classes only (no symbol) → fails the 4-class rule under strict policy.
    const res = evaluatePasswordStrength("Abcd1234", strict);
    expect(res.ok).toBe(false);
    expect(res.errors.join()).toMatch(/4 of/);
  });
});
