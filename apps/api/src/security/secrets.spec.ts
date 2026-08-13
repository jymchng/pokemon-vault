import { describe, expect, it, vi } from "vitest";
import {
  AwsSecretsManagerProvider,
  DopplerSecretProvider,
  EnvSecretProvider,
  getRequiredSecret,
  getSecretProvider,
  maskConnectionString,
  SecretFetcher,
} from "./secrets";

describe("secrets (§56)", () => {
  describe("EnvSecretProvider", () => {
    it("reads from the environment and throws (naming only) on missing", async () => {
      const provider = new EnvSecretProvider({ FOO: "bar" } as NodeJS.ProcessEnv);
      await expect(provider.get("FOO")).resolves.toBe("bar");
      await expect(provider.get("MISSING")).rejects.toThrow("MISSING");
    });
  });

  describe("DopplerSecretProvider", () => {
    it("fetches the secrets map once and caches it", async () => {
      const fetchMock = vi.fn<SecretFetcher>(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ JWT_SECRET: "doppler-jwt", STRIPE_SECRET_KEY: "sk_doppler" }),
      }));
      const provider = new DopplerSecretProvider({
        token: "dp.pt.test",
        fetcher: fetchMock as any,
      });
      await expect(provider.get("JWT_SECRET")).resolves.toBe("doppler-jwt");
      await expect(provider.get("STRIPE_SECRET_KEY")).resolves.toBe("sk_doppler");
      expect(fetchMock).toHaveBeenCalledTimes(1); // cached — one network call
      const [url, init] = fetchMock.mock.calls[0];
      expect(String(url)).toContain("api.doppler.com");
      expect((init as any).headers.Authorization).toBe("Bearer dp.pt.test");
    });

    it("throws on HTTP failure or missing secret", async () => {
      const provider = new DopplerSecretProvider({
        token: "bad",
        fetcher: (async () => ({ ok: false, status: 401, json: async () => ({}) })) as any,
      });
      await expect(provider.get("JWT_SECRET")).rejects.toThrow("HTTP 401");
      const ok = new DopplerSecretProvider({
        token: "t",
        fetcher: (async () => ({ ok: true, status: 200, json: async () => ({ A: "1" }) })) as any,
      });
      await expect(ok.get("NOPE")).rejects.toThrow("NOPE");
    });
  });

  describe("AwsSecretsManagerProvider", () => {
    it("parses the JSON SecretString and caches", async () => {
      const send = vi.fn(async () => JSON.stringify({ JWT_SECRET: "aws-jwt" }));
      const provider = new AwsSecretsManagerProvider({
        arn: "arn:aws:secretsmanager:eu-central-1:1:secret:pv/prod",
        region: "eu-central-1",
        loadClient: async () => ({ client: {} as any, send: send as any }),
      });
      await expect(provider.get("JWT_SECRET")).resolves.toBe("aws-jwt");
      await expect(provider.get("JWT_SECRET")).resolves.toBe("aws-jwt");
      expect(send).toHaveBeenCalledTimes(1); // cached
      await expect(provider.get("MISSING")).rejects.toThrow("MISSING");
    });
  });

  describe("getSecretProvider", () => {
    it("defaults to env and rejects unknown providers", () => {
      expect(getSecretProvider({}).name).toBe("env");
      expect(getSecretProvider({ POKE_VAULT_SECRETS_PROVIDER: "env" }).name).toBe("env");
      expect(() => getSecretProvider({ POKE_VAULT_SECRETS_PROVIDER: "nope" })).toThrow("Unknown POKE_VAULT_SECRETS_PROVIDER");
    });

    it("selects doppler only with a token, aws only with arn+region", () => {
      expect(() => getSecretProvider({ POKE_VAULT_SECRETS_PROVIDER: "doppler" })).toThrow("POKE_VAULT_DOPPLER_TOKEN");
      expect(getSecretProvider({ POKE_VAULT_SECRETS_PROVIDER: "doppler", POKE_VAULT_DOPPLER_TOKEN: "x" }).name).toBe("doppler");
      expect(() => getSecretProvider({ POKE_VAULT_SECRETS_PROVIDER: "aws" })).toThrow("POKE_VAULT_SECRETS_ARN");
      expect(
        getSecretProvider({ POKE_VAULT_SECRETS_PROVIDER: "aws", POKE_VAULT_SECRETS_ARN: "a", POKE_VAULT_AWS_REGION: "r" }).name,
      ).toBe("aws");
    });
  });

  describe("getRequiredSecret / maskConnectionString", () => {
    it("wraps failures with the variable name (never the value)", async () => {
      await expect(
        getRequiredSecret(new EnvSecretProvider({}), "JWT_SECRET"),
      ).rejects.toThrow("'JWT_SECRET'");
    });

    it("masks passwords in connection strings for logs", () => {
      const masked = maskConnectionString(
        "postgres://pv_app:sup3rs3cret@db.internal:5432/pokemon_vault?sslmode=require",
      );
      expect(masked).not.toContain("sup3rs3cret");
      expect(masked).toContain("***");
      expect(masked).toContain("pv_app:***@db.internal");
      expect(maskConnectionString("not a url")).toBe("<unparseable connection string>");
    });
  });
});
