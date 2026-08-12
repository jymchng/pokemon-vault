import { Module } from "@nestjs/common";
import { PacksController } from "./packs.controller";
import { PacksService } from "./packs.service";
import { PacksRepository } from "./packs.repository";

@Module({
  controllers: [PacksController],
  providers: [PacksService, PacksRepository],
  exports: [PacksService],
})
export class PacksModule {}
