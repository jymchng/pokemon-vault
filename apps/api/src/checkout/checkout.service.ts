import { Injectable } from "@nestjs/common";
import { CheckoutRepository } from "./checkout.repository";
import { CheckoutDto } from "./checkout.dto";

@Injectable()
export class CheckoutService {
  constructor(private readonly repo: CheckoutRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<CheckoutDto[]> {
    return this.repo.findAll();
  }
}
