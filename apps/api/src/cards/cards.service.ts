import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CardDto,
  CardGradeDto,
  CardListResult,
  CardQueryDto,
  CreateCardDto,
  CreateCardGradeDto,
  UpdateCardDto,
  UpdateCardGradeDto,
} from "./cards.dto";
import { CardsRepository } from "./cards.repository";

@Injectable()
export class CardsService {
  constructor(private readonly repo: CardsRepository) {}

  /** Public card catalog — cursor pagination (§86). */
  async list(query: CardQueryDto & { cursor?: string }): Promise<{
    items: CardListResult["items"];
    meta: import("../common/cursor-pagination").CursorPageMeta;
  }> {
    return this.repo.findAllCursor({
      setId: query.setId,
      rarity: query.rarity,
      type: query.type,
      language: query.language,
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  async getById(id: string, includeLinked = false): Promise<CardDto> {
    const card = await this.repo.findById(id, includeLinked);
    if (!card) throw new NotFoundException("Card not found");
    return card;
  }

  async create(input: CreateCardDto): Promise<CardDto> {
    try {
      return await this.repo.create(input);
    } catch (err: any) {
      if (err?.code === "P2002") throw new ConflictException("Card already exists");
      if (err?.code === "P2003") throw new BadRequestException("Invalid setId");
      throw err;
    }
  }

  async update(id: string, input: UpdateCardDto): Promise<CardDto> {
    try {
      const card = await this.repo.update(id, input);
      if (!card) throw new NotFoundException("Card not found");
      return card;
    } catch (err: any) {
      if (err?.code === "P2025") throw new NotFoundException("Card not found");
      if (err?.code === "P2003") throw new BadRequestException("Invalid setId");
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.repo.softDelete(id);
    } catch (err: any) {
      if (err?.code === "P2025") throw new NotFoundException("Card not found");
      throw err;
    }
  }

  /** Link a card product (Product row) to this card; card metadata stays on Card only. */
  async linkProduct(cardId: string, productId: string): Promise<void> {
    await this.getById(cardId);
    try {
      await this.repo.linkProduct(cardId, productId);
    } catch (err: any) {
      if (err?.code === "P2002") throw new ConflictException("Product already linked to card");
      if (err?.code === "P2003") throw new NotFoundException("Product not found");
      throw err;
    }
  }

  async unlinkProduct(cardId: string, productId: string): Promise<void> {
    await this.getById(cardId);
    await this.repo.unlinkProduct(cardId, productId);
  }

  // ---- Grading (§17) ----

  async listGrades(cardId: string): Promise<CardGradeDto[]> {
    await this.getById(cardId);
    return this.repo.findGradesByCardId(cardId);
  }

  async addGrade(cardId: string, input: CreateCardGradeDto): Promise<CardGradeDto> {
    await this.getById(cardId);
    try {
      return await this.repo.addGrade(cardId, input);
    } catch (err: any) {
      if (err?.code === "P2002") throw new ConflictException("This grade already exists on the card");
      throw err;
    }
  }

  async updateGrade(gradeId: string, input: UpdateCardGradeDto): Promise<CardGradeDto> {
    try {
      const grade = await this.repo.updateGrade(gradeId, input);
      if (!grade) throw new NotFoundException("Grade not found");
      return grade;
    } catch (err: any) {
      if (err?.code === "P2025") throw new NotFoundException("Grade not found");
      if (err?.code === "P2002") throw new ConflictException("This grade already exists on the card");
      throw err;
    }
  }

  async removeGrade(gradeId: string): Promise<void> {
    try {
      await this.repo.removeGrade(gradeId);
    } catch (err: any) {
      if (err?.code === "P2025") throw new NotFoundException("Grade not found");
      throw err;
    }
  }
}
