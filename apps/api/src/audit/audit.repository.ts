import { Injectable } from "@nestjs/common";
import { AuditDto } from "./audit.dto";

@Injectable()
export class AuditRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<AuditDto[]> {
    return [];
  }
}
