import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "reflect-metadata";
import helmet from "helmet";
import { GlobalErrorFilter } from "./common/global-error.filter";
import { CorrelationService } from "./common/correlation.service";
import { ObservabilityModule } from "./observability/observability.module";
import { initSentry } from "./observability/sentry";
import { initTracing } from "./observability/tracing";
import { parseCorsOrigins } from "./security/cors";
import { loadConfig } from "@pokemon-vault/config";

/** Walk up from cwd to the pnpm workspace root (where .env lives). */
function findWorkspaceRoot(start: string): string | null {
  let dir = start;
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

// Load env: cwd/.env first (package-local), then the monorepo root .env.
// First-loaded values win; repo-root .env is the documented location.
loadEnv();
const root = findWorkspaceRoot(process.cwd());
if (root) loadEnv({ path: resolve(root, ".env") });
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import { StructuredLogger } from "./common/structured-logger";

async function bootstrap() {
  // Centralized validated configuration (G54 + §108): config/app.toml is the
  // source of truth for non-secret tunables; POKE_VAULT_* env vars override
  // toml values; secrets resolve from POKE_VAULT_* env only. Throws (fail-fast)
  // before the server binds if the configuration is invalid.
  const cfg = loadConfig(process.env);

  // Observability bootstrap (§67-69): Sentry + OpenTelemetry first so early
  // errors are captured; both are no-ops when unconfigured.
  initSentry(cfg.observability.sentryDsn, cfg.nodeEnv, cfg.observability.sentryRelease);
  initTracing(cfg.observability.otelEndpoint);
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Structured JSON logs (§65): all Nest loggers emit JSON with ts/level/
  // service/environment/request_id/user_id; secrets are redacted.
  app.useLogger(app.get(StructuredLogger));
  app.useGlobalFilters(new GlobalErrorFilter(app.get(CorrelationService)));
  app.setGlobalPrefix("api/v1", { exclude: ["metrics"] });

  // OpenAPI/Swagger (§85): docs at /api/v1/docs. Enabled in dev + staging;
  // in production it is protected behind an access token (POKE_VAULT_API_DOCS_TOKEN)
  // or disabled entirely when not configured. The document reflects the
  // real routes/DTAs via SwaggerPlugin decorators in the controllers.
  if (cfg.nodeEnv !== "production" || cfg.apiDocsToken) {
    const { SwaggerModule, DocumentBuilder } = await import("@nestjs/swagger");
    const config = new DocumentBuilder()
      .setTitle("Pokémon Vault API")
      .setDescription(
        "REST API — auth (cookie/bearer), products, cards, sets, inventory, " +
          "cart, checkout, orders, payments, shipping, collection, packs, " +
          "rewards, notifications, search, media. Response envelope " +
          "{ data, meta } (§50); error envelope { error: { code, message, details } } (§102); " +
          "pagination §86 (cursor for catalog, offset for admin).",
      )
      .setVersion("v1")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/v1/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    console.log(`[docs] Swagger UI at /api/v1/docs (${cfg.nodeEnv})`);
  }

  // Security headers (§53): Helmet default (incl. X-Content-Type-Options:
  // nosniff) + CSP (prod) + HSTS (prod) + Referrer-Policy: same-origin.
  // Express's X-Powered-By is disabled — no server fingerprinting.
  const isProd = cfg.isProduction;
  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: isProd ? undefined : false, // CSP on in prod
      hsts: isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: "same-origin" },
    }),
  );

  // Behind a reverse proxy (prod) honor X-Forwarded-For so the rate limiter
  // sees the real client IP instead of the proxy's (per-client buckets).
  if (isProd) app.set("trust proxy", 1);

  // CORS (§54): restrict to the configured webOrigin allow-list (never * for
  // authenticated APIs). Credentials (cookies) are sent only on that origin.
  app.enableCors({
    origin: parseCorsOrigins(cfg.webOrigin.join(",")),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  const port = cfg.port;
  await app.listen(port);
  console.log(`Pokémon Vault API listening on :${port} (api/v1)`);

  // Graceful shutdown (§64): SIGTERM/SIGINT → stop accepting new connections,
  // drain in-flight requests, then run lifecycle hooks (app.close() triggers
  // onModuleDestroy for PrismaService → $disconnect, QueueService → close
  // queues + Redis, ThrottlerStorageRedisService → disconnect). A watchdog
  // force-exits if drain hangs (e.g. a stuck long-polling request).
  const SHUTDOWN_TIMEOUT_MS = cfg.shutdownTimeoutMs;
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return; // second signal during drain: ignore (watchdog covers it)
    shuttingDown = true;
    console.log(
      `[shutdown] ${signal} received — stopping accept, draining in-flight…`,
    );
    const watchdog = setTimeout(() => {
      console.error(
        `[shutdown] drain exceeded ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`,
      );
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    watchdog.unref();
    try {
      await app.close(); // close HTTP server (drain) + DB/Redis/queue lifecycle hooks
      clearTimeout(watchdog);
      console.log("[shutdown] clean — connections closed, exiting");
      process.exit(0);
    } catch (err) {
      console.error("[shutdown] error during close", err);
      process.exit(1);
    }
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}
void bootstrap();
