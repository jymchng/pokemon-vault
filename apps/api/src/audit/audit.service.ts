import { Injectable } from "@nestjs/common";
import { AuditRepository } from "./audit.repository";
import { AuditDto } from "./audit.dto";

@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<AuditDto[]> {
    return this.repo.findAll();
  }
}
