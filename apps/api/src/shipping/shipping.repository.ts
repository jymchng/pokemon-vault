import { Injectable } from "@nestjs/common";
import { ShippingDto } from "./shipping.dto";

@Injectable()
export class ShippingRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<ShippingDto[]> {
    return [];
  }
}
