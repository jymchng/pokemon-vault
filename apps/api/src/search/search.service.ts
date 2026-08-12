import { Injectable } from "@nestjs/common";
import { SearchRepository } from "./search.repository";
import { SearchDto } from "./search.dto";

@Injectable()
export class SearchService {
  constructor(private readonly repo: SearchRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<SearchDto[]> {
    return this.repo.findAll();
  }
}
