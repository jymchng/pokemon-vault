import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "reflect-metadata";
import helmet from "helmet";
import { GlobalErrorFilter } from "./common/global-error.filter";
import { parseCorsOrigins } from "./security/cors";

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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useGlobalFilters(new GlobalErrorFilter());
  app.setGlobalPrefix("api/v1");

  // Security headers (§53): Helmet default (incl. X-Content-Type-Options:
  // nosniff) + CSP (prod) + HSTS (prod) + Referrer-Policy: same-origin.
  // Express's X-Powered-By is disabled — no server fingerprinting.
  const isProd = process.env.NODE_ENV === "production";
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

  // CORS (§54): restrict to the WEB_ORIGIN allow-list (never * for
  // authenticated APIs). Credentials (cookies) are sent only on that origin.
  app.enableCors({
    origin: parseCorsOrigins(process.env.WEB_ORIGIN),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  const port = Number(process.env.API_PORT || process.env.PORT || 3001);
  await app.listen(port);
  console.log(`Pokémon Vault API listening on :${port} (api/v1)`);
}
void bootstrap();
