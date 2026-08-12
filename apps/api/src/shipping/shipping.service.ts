import { Injectable } from "@nestjs/common";
import { ShippingRepository } from "./shipping.repository";
import { ShippingDto } from "./shipping.dto";

@Injectable()
export class ShippingService {
  constructor(private readonly repo: ShippingRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<ShippingDto[]> {
    return this.repo.findAll();
  }
}
