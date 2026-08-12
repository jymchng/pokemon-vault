import { Injectable } from "@nestjs/common";
import { InventoryDto } from "./inventory.dto";

@Injectable()
export class InventoryRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<InventoryDto[]> {
    return [];
  }
}
