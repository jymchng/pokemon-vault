import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

// SQLite adapter for Prisma 7 (runtime driver adapter pattern)
// DATABASE_URL is file:./dev.db — resolve relative to project root (matches prisma.config.ts)
const dbPath = process.env.DATABASE_URL?.replace("file:", "") ?? "dev.db";
const adapter = new PrismaBetterSqlite3({
  url: path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath),
});

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
