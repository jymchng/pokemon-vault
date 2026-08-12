import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateNotificationDto, UpdatePreferencesDto } from "./notifications.dto";
import { NotificationsRepository } from "./notifications.repository";

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  async list(userId: string, query: { unreadOnly?: boolean; type?: string; page: number; limit: number }) {
    return this.repo.findForUser(userId, query);
  }

  async markRead(userId: string, id: string) {
    const ok = await this.repo.markRead(userId, id);
    if (!ok) throw new NotFoundException("Notification not found");
    return { read: true };
  }

  async markAllRead(userId: string) {
    return { marked: await this.repo.markAllRead(userId) };
  }

  async create(input: CreateNotificationDto) {
    return this.repo.create(input);
  }

  async getPreferences(userId: string) {
    return this.repo.getPreferences(userId);
  }

  async updatePreferences(userId: string, input: UpdatePreferencesDto) {
    return this.repo.updatePreferences(userId, input);
  }
}
