import { Injectable } from "@nestjs/common";
import { SearchDto } from "./search.dto";
import { SearchRepository } from "./search.repository";

@Injectable()
export class SearchService {
  constructor(private readonly repo: SearchRepository) {}

  async search(query: SearchDto) {
    return this.repo.search(query);
  }
}
