import { Injectable } from "@nestjs/common";
import { AdminDto } from "./admin.dto";

@Injectable()
export class AdminRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<AdminDto[]> {
    return [];
  }
}
