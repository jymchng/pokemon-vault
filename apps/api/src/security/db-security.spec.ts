import { describe, expect, it } from "vitest";
import {
  assertSecureDbConfig,
  buildDbSslOptions,
  resolveDbSslMode,
} from "./db-security";

const DEV_ENV = { NODE_ENV: "development" } as NodeJS.ProcessEnv;
const PROD_ENV = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://pv_app:pw@db.internal:5432/pokemon_vault",
} as NodeJS.ProcessEnv;

describe("db security (§55)", () => {
  describe("resolveDbSslMode", () => {
    it("defaults to disable locally and require in production", () => {
      expect(resolveDbSslMode(DEV_ENV)).toBe("disable");
      expect(resolveDbSslMode(PROD_ENV)).toBe("require");
    });

    it("honors explicit DATABASE_SSLMODE and rejects invalid values", () => {
      expect(resolveDbSslMode({ NODE_ENV: "production", DATABASE_SSLMODE: "verify-full" })).toBe(
        "verify-full",
      );
      expect(() => resolveDbSslMode({ DATABASE_SSLMODE: "bogus" })).toThrow(
        "Invalid DATABASE_SSLMODE",
      );
    });
  });

  describe("buildDbSslOptions", () => {
    it("returns undefined when disabled and TLS config when enabled", () => {
      expect(buildDbSslOptions(DEV_ENV)).toBeUndefined();
      expect(buildDbSslOptions(PROD_ENV)).toEqual({ rejectUnauthorized: false });
      expect(
        buildDbSslOptions({
          NODE_ENV: "production",
          DATABASE_SSLMODE: "verify-full",
          DATABASE_SSL_CA: "CERT",
        }),
      ).toEqual({ rejectUnauthorized: true, ca: "CERT" });
    });
  });

  describe("assertSecureDbConfig", () => {
    it("passes silently in development", () => {
      expect(() => assertSecureDbConfig(DEV_ENV)).not.toThrow();
    });

    it("fails closed in production without DATABASE_URL or without TLS", () => {
      expect(() => assertSecureDbConfig({ NODE_ENV: "production" })).toThrow("DATABASE_URL");
      expect(() =>
        assertSecureDbConfig({ ...PROD_ENV, DATABASE_SSLMODE: "disable" }),
      ).toThrow("encrypted DB connections");
    });

    it("accepts a well-formed prod URL", () => {
      expect(() => assertSecureDbConfig(PROD_ENV)).not.toThrow();
    });

    it("rejects non-postgres protocols and credential-less URLs in prod", () => {
      expect(() =>
        assertSecureDbConfig({ ...PROD_ENV, DATABASE_URL: "mysql://u:p@h/db" }),
      ).toThrow("postgres");
      expect(() =>
        assertSecureDbConfig({
          ...PROD_ENV,
          DATABASE_URL: "postgres://db.internal:5432/pokemon_vault",
        }),
      ).toThrow("credentials");
    });
  });
});
