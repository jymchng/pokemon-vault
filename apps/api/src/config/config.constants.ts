import { Inject } from "@nestjs/common";

/**
 * DI token for the validated AppConfig object (§108).
 * Lives in its own file so neither ConfigModule nor FeatureFlagService import
 * each other (avoids a CJS circular-import TDZ where @Inject(APP_CONFIG)
 * would see `undefined` at class-declaration time).
 */
export const APP_CONFIG = Symbol("APP_CONFIG");

/** Convenience injection helper for typed constructor params. */
export const InjectConfig = () => Inject(APP_CONFIG);
