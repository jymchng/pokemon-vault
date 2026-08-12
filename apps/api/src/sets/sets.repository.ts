import { Injectable } from "@nestjs/common";
import { SetsDto } from "./sets.dto";

@Injectable()
export class SetsRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<SetsDto[]> {
    return [];
  }
}
