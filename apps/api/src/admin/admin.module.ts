import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminRepository } from "./admin.repository";

@Module({
  imports: [AuditModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}
