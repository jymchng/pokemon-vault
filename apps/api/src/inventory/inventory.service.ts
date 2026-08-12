import { Injectable } from "@nestjs/common";
import { InventoryRepository } from "./inventory.repository";
import { InventoryDto } from "./inventory.dto";

@Injectable()
export class InventoryService {
  constructor(private readonly repo: InventoryRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<InventoryDto[]> {
    return this.repo.findAll();
  }
}
