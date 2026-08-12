import { Injectable } from "@nestjs/common";
import { CardsRepository } from "./cards.repository";
import { CardsDto } from "./cards.dto";

@Injectable()
export class CardsService {
  constructor(private readonly repo: CardsRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<CardsDto[]> {
    return this.repo.findAll();
  }
}
