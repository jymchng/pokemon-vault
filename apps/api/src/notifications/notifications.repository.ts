import { Injectable } from "@nestjs/common";
import { NotificationsDto } from "./notifications.dto";

@Injectable()
export class NotificationsRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<NotificationsDto[]> {
    return [];
  }
}
