import { Module } from "@nestjs/common";
import { APP_CONFIG } from "../config/config.constants";
import { MaintenanceService, MAINTENANCE_RETENTION, MAINTENANCE_SCHEDULES } from "./maintenance.service";
import { PrismaModule } from "../prisma/prisma.module";

/**
 * Scheduled jobs module (§106): MaintenanceService runs the cron-driven
 * cleanup/aggregation jobs with schedules from the centralized config
 * (CRON_* env, validated at startup). Imported globally via AppModule so the
 * scheduler starts with the API process.
 */
@Module({
  imports: [PrismaModule],
  providers: [
    MaintenanceService,
    {
      provide: MAINTENANCE_SCHEDULES,
      useFactory: (cfg: any) => cfg.cron,
      inject: [APP_CONFIG],
    },
    {
      provide: MAINTENANCE_RETENTION,
      useFactory: (cfg: any) => cfg.retention,
      inject: [APP_CONFIG],
    },
  ],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
