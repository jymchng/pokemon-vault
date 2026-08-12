import { Injectable } from "@nestjs/common";
import { OrdersDto } from "./orders.dto";

@Injectable()
export class OrdersRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<OrdersDto[]> {
    return [];
  }
}
