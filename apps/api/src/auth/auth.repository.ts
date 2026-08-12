import { Injectable } from "@nestjs/common";
import { AuthDto } from "./auth.dto";

@Injectable()
export class AuthRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<AuthDto[]> {
    return [];
  }
}
