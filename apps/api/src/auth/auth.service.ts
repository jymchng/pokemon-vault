import { Injectable } from "@nestjs/common";
import { AuthRepository } from "./auth.repository";
import { AuthDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<AuthDto[]> {
    return this.repo.findAll();
  }
}
