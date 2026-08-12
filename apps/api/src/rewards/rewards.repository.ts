import { Injectable } from "@nestjs/common";
import { RewardsDto } from "./rewards.dto";

@Injectable()
export class RewardsRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<RewardsDto[]> {
    return [];
  }
}
