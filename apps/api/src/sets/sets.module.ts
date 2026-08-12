import { Module } from "@nestjs/common";
import { SetsController } from "./sets.controller";
import { SetsService } from "./sets.service";
import { SetsRepository } from "./sets.repository";

@Module({
  controllers: [SetsController],
  providers: [SetsService, SetsRepository],
  exports: [SetsService],
})
export class SetsModule {}
