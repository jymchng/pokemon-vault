import { Injectable } from "@nestjs/common";
import { ProductsRepository } from "./products.repository";
import { ProductsDto } from "./products.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<ProductsDto[]> {
    return this.repo.findAll();
  }
}
