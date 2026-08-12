import { Injectable } from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";
import { NotificationsDto } from "./notifications.dto";

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<NotificationsDto[]> {
    return this.repo.findAll();
  }
}
