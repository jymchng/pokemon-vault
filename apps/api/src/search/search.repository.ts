import { Injectable } from "@nestjs/common";
import { SearchDto } from "./search.dto";

@Injectable()
export class SearchRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<SearchDto[]> {
    return [];
  }
}
