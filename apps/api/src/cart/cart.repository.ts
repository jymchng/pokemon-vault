import { Injectable } from "@nestjs/common";
import { CartDto } from "./cart.dto";

@Injectable()
export class CartRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<CartDto[]> {
    return [];
  }
}
