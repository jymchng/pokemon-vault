import { Injectable } from "@nestjs/common";
import { PaymentsDto } from "./payments.dto";

@Injectable()
export class PaymentsRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<PaymentsDto[]> {
    return [];
  }
}
