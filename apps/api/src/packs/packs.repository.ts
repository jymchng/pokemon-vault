import { Injectable } from "@nestjs/common";
import { PacksDto } from "./packs.dto";

@Injectable()
export class PacksRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<PacksDto[]> {
    return [];
  }
}
