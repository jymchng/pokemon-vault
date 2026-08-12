import { Injectable } from "@nestjs/common";
import { UsersDto } from "./users.dto";

@Injectable()
export class UsersRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<UsersDto[]> {
    return [];
  }
}
