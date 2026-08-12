import { Injectable } from "@nestjs/common";
import { CollectionDto } from "./collection.dto";

@Injectable()
export class CollectionRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<CollectionDto[]> {
    return [];
  }
}
