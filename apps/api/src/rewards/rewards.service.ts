import { Injectable } from "@nestjs/common";
import { RewardsRepository } from "./rewards.repository";
import { RewardsDto } from "./rewards.dto";

@Injectable()
export class RewardsService {
  constructor(private readonly repo: RewardsRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<RewardsDto[]> {
    return this.repo.findAll();
  }
}
