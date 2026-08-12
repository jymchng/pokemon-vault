import { describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { loadConfig } from "@pokemon-vault/config";
import { APP_CONFIG } from "./config.constants";
import { ConfigModule } from "./config.module";
import { FeatureFlagService } from "./feature-flag.service";
import { FeatureDisabledError } from "../common/app-error";

/** Minimal complete env for ConfigModule's loadConfig(). */
const FULL_ENV: Record<string, string> = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  REDIS_URL: "redis://localhost:6379",
  JWT_SECRET: "0123456789abcdef0123456789abcdef",
  JWT_REFRESH_SECRET: "0123456789abcdef0123456789abcdef",
  WEB_ORIGIN: "http://localhost:3000",
};

function withEnv(env: Record<string, string>, fn: () => Promise<void>) {
  const saved = { ...process.env };
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  return fn().finally(() => {
    process.env = saved;
  });
}

describe("config module (§106-108)", () => {
  it("provides validated config + feature flag service", async () => {
    await withEnv(FULL_ENV, async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule],
      }).compile();

      const cfg = moduleRef.get(APP_CONFIG) as any;
      expect(cfg.nodeEnv).toBe("development");
      expect(cfg.featureFlags.packOpeningEnabled).toBe(true);
      expect(cfg.cron.releaseReservations).toBe("* * * * *");
      expect(cfg.cron.dbMaintenance).toBe("45 3 * * *");
      expect(typeof cfg.databaseUrl).toBe("string");

      const flags = moduleRef.get(FeatureFlagService);
      expect(flags.isEnabled("packOpeningEnabled")).toBe(true);
      await moduleRef.close();
    });
  });

  it("loadConfig fails fast on missing required vars (fail-fast §108)", () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    expect(() => loadConfig({ ...FULL_ENV, REDIS_URL: "" })).toThrow(/REDIS_URL/);
  });

  it("assertEnabled throws FEATURE_DISABLED (403) when a flag is off", async () => {
    await withEnv(FULL_ENV, async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ConfigModule],
      }).compile();
      const cfg = moduleRef.get(APP_CONFIG) as any;
      // Force a disabled flag via a stub AppConfig.
      const stub = { ...cfg, featureFlags: { ...cfg.featureFlags, rewardsEnabled: false } };
      const svc = new FeatureFlagService(stub);
      try {
        svc.assertEnabled("rewardsEnabled");
        expect.unreachable("should have thrown");
      } catch (err: any) {
        expect(err).toBeInstanceOf(FeatureDisabledError);
        expect(err.code).toBe("FEATURE_DISABLED");
        expect(err.getStatus()).toBe(403);
      }
      await moduleRef.close();
    });
  });
});
