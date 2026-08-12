import { Injectable } from "@nestjs/common";
import { OrdersRepository } from "./orders.repository";
import { OrdersDto } from "./orders.dto";

@Injectable()
export class OrdersService {
  constructor(private readonly repo: OrdersRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<OrdersDto[]> {
    return this.repo.findAll();
  }
}
