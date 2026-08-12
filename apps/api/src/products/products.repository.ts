import { Injectable } from "@nestjs/common";
import { ProductsDto } from "./products.dto";

@Injectable()
export class ProductsRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<ProductsDto[]> {
    return [];
  }
}
