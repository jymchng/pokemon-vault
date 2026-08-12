import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  assertSecureDbConfig,
  buildDbSslOptions,
} from "../security/db-security";

/**
 * Prisma 7 requires a driver adapter; the pg adapter is wired from DATABASE_URL.
 * Production connections are encrypted (sslmode=require default, §55) and the
 * prod posture is validated at startup (private networking + least-privilege
 * credentials + encrypted transport are enforced by the deployment, verified
 * here fail-closed).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    assertSecureDbConfig(process.env);
    super({
      adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
        ssl: buildDbSslOptions(process.env),
      }),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
