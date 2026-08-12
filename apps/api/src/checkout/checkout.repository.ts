import { Injectable } from "@nestjs/common";
import { CheckoutDto } from "./checkout.dto";

@Injectable()
export class CheckoutRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<CheckoutDto[]> {
    return [];
  }
}
