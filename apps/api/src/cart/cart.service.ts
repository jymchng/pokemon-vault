import { Injectable } from "@nestjs/common";
import { CartRepository } from "./cart.repository";
import { CartDto } from "./cart.dto";

@Injectable()
export class CartService {
  constructor(private readonly repo: CartRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<CartDto[]> {
    return this.repo.findAll();
  }
}
