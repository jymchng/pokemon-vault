import { Injectable } from "@nestjs/common";
import { UsersRepository } from "./users.repository";
import { UsersDto } from "./users.dto";

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<UsersDto[]> {
    return this.repo.findAll();
  }
}
