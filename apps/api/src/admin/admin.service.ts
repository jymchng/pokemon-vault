import { Injectable } from "@nestjs/common";
import { AdminRepository } from "./admin.repository";
import { AdminDto } from "./admin.dto";

@Injectable()
export class AdminService {
  constructor(private readonly repo: AdminRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<AdminDto[]> {
    return this.repo.findAll();
  }
}
