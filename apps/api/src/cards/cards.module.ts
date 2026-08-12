import { Module } from "@nestjs/common";
import { CardsController } from "./cards.controller";
import { CardsService } from "./cards.service";
import { CardsRepository } from "./cards.repository";

@Module({
  controllers: [CardsController],
  providers: [CardsService, CardsRepository],
  exports: [CardsService],
})
export class CardsModule {}
