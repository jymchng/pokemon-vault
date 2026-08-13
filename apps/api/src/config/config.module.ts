import { Global, Module } from "@nestjs/common";
import { loadConfig } from "@pokemon-vault/config";
import { APP_CONFIG } from "./config.constants";
import { FeatureFlagService } from "./feature-flag.service";

/**
 * Centralized validated configuration (§108).
 *
 * - Single validated view of the environment (fail-fast): loadConfig throws
 *   ConfigValidationError listing every missing/invalid variable NAME at
 *   bootstrap — before the HTTP server ever binds a port — so a misconfigured
 *   prod deployment never serves traffic with placeholder/missing secrets.
 * - Exposes feature flags (§107) and cron schedules (§106) through the same
 *   object; FeatureFlagService adds a typed assertion helper for controllers
 *   and services.
 */
@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: () => loadConfig(process.env),
    },
    FeatureFlagService,
  ],
  exports: [APP_CONFIG, FeatureFlagService],
})
export class ConfigModule {}
