import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import "reflect-metadata";
import { GlobalErrorFilter } from "./common/global-error.filter";

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
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalErrorFilter());
  app.setGlobalPrefix("api/v1");
  const port = Number(process.env.API_PORT || process.env.PORT || 3001);
  await app.listen(port);
  console.log(`Pokémon Vault API listening on :${port} (api/v1)`);
}
void bootstrap();
