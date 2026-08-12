import { Injectable } from "@nestjs/common";
import { SetsRepository } from "./sets.repository";
import { SetsDto } from "./sets.dto";

@Injectable()
export class SetsService {
  constructor(private readonly repo: SetsRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<SetsDto[]> {
    return this.repo.findAll();
  }
}
