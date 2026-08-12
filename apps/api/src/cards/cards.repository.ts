import { Injectable } from "@nestjs/common";
import { CardsDto } from "./cards.dto";

@Injectable()
export class CardsRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<CardsDto[]> {
    return [];
  }
}
