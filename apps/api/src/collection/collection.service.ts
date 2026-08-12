import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AddItemDto, UpdateItemDto } from "./collection.dto";
import { CollectionRepository } from "./collection.repository";

@Injectable()
export class CollectionService {
  constructor(private readonly repo: CollectionRepository) {}

  async listItems(userId: string) {
    return this.repo.findItems(userId);
  }

  async addItem(userId: string, input: AddItemDto) {
    const item = await this.repo.addItem(userId, input);
    await this.repo.recordActivity(userId, {
      eventType: "CARD_ADDED",
      entityType: "card",
      entityId: input.cardId,
      metadata: { quantity: input.quantity, source: input.source ?? "MANUAL_ENTRY" },
    });
    return item;
  }

  async updateItem(userId: string, cardId: string, input: UpdateItemDto) {
    const updated = await this.repo.updateItem(userId, cardId, input);
    if (!updated) throw new NotFoundException("Collection item not found");
    return updated;
  }

  /** Remove copies; records CARD_REMOVED when the line is gone. */
  async removeItem(userId: string, cardId: string, quantity = 1) {
    const item = await this.repo.findItem(userId, cardId);
    if (!item) throw new NotFoundException("Collection item not found");
    const ok = await this.repo.removeItem(userId, cardId, quantity);
    if (!ok) throw new NotFoundException("Collection item not found");
    if (item.quantity - quantity <= 0) {
      await this.repo.recordActivity(userId, {
        eventType: "CARD_REMOVED",
        entityType: "card",
        entityId: cardId,
        metadata: { quantity: item.quantity },
      });
    }
    return { removed: true };
  }

  async setProgress(userId: string) {
    return this.repo.setProgress(userId);
  }

  async setProgressFor(setId: string, userId: string) {
    const progress = await this.repo.setProgressFor(setId, userId);
    if (!progress) throw new NotFoundException("Set not found");
    return progress;
  }

  async activity(userId: string, page: number, limit: number) {
    return this.repo.listActivity(userId, page, limit);
  }
}
