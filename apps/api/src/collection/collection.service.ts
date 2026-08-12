import { Injectable } from "@nestjs/common";
import { CollectionRepository } from "./collection.repository";
import { CollectionDto } from "./collection.dto";

@Injectable()
export class CollectionService {
  constructor(private readonly repo: CollectionRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<CollectionDto[]> {
    return this.repo.findAll();
  }
}
