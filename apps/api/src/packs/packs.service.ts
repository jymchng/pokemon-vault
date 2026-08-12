import { Injectable } from "@nestjs/common";
import { PacksRepository } from "./packs.repository";
import { PacksDto } from "./packs.dto";

@Injectable()
export class PacksService {
  constructor(private readonly repo: PacksRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<PacksDto[]> {
    return this.repo.findAll();
  }
}
