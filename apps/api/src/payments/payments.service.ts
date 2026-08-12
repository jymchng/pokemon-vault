import { Injectable } from "@nestjs/common";
import { PaymentsRepository } from "./payments.repository";
import { PaymentsDto } from "./payments.dto";

@Injectable()
export class PaymentsService {
  constructor(private readonly repo: PaymentsRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<PaymentsDto[]> {
    return this.repo.findAll();
  }
}
