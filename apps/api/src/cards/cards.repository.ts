import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CardDto, CardListResult } from "./cards.dto";

const CARD_SELECT = {
  id: true,
  name: true,
  setName: true,
  cardNumber: true,
  rarity: true,
  type: true,
  hp: true,
  language: true,
  imageUrl: true,
  description: true,
  grade: true,
  condition: true,
  marketPrice: true,
  population: true,
  metadata: true,
  setId: true,
  createdAt: true,
  updatedAt: true,
} as const;

const LINKED_PRODUCT_SELECT = {
  product: {
    select: {
      id: true,
      sku: true,
      name: true,
      price: true,
      status: true,
      inventoryItems: { select: { quantity: true, reserved: true, status: true } },
    },
  },
} as const;

function mapCard(row: any): CardDto {
  const { products, ...rest } = row;
  const card: CardDto = {
    ...rest,
    marketPrice: rest.marketPrice == null ? null : Number(rest.marketPrice),
    metadata: (rest.metadata as Record<string, unknown> | null) ?? null,
  };
  if (products) {
    // The card product references this card: it carries its own SKU/price/
    // inventory, while grade/condition/language are projected from the Card row
    // (never duplicated into Product columns).
    card.linkedProducts = products.map((link: any) => {
      const p = link.product;
      const inv = p.inventoryItems?.[0];
      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        price: Number(p.price),
        status: p.status,
        inventoryQuantity: inv ? inv.quantity - inv.reserved : 0,
        grade: rest.grade ?? null,
        condition: rest.condition ?? null,
        language: rest.language,
      };
    });
  }
  return card;
}

@Injectable()
export class CardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(opts: {
    setName?: string;
    setId?: string;
    setSlug?: string;
    rarity?: string;
    type?: string;
    language?: string;
    search?: string;
    page: number;
    limit: number;
  }): Promise<CardListResult> {
    const where: any = { deletedAt: null };
    if (opts.setName) where.setName = opts.setName;
    if (opts.rarity) where.rarity = opts.rarity;
    if (opts.type) where.type = opts.type;
    if (opts.language) where.language = opts.language;
    if (opts.setId) where.setId = opts.setId;
    if (opts.setSlug) where.setRelation = { slug: opts.setSlug };
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: "insensitive" } },
        { cardNumber: { contains: opts.search, mode: "insensitive" } },
        { rarity: { contains: opts.search, mode: "insensitive" } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.card.findMany({
        where,
        select: CARD_SELECT,
        orderBy: [{ setName: "asc" }, { cardNumber: "asc" }],
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.card.count({ where }),
    ]);
    return { items: rows.map(mapCard), total, page: opts.page, limit: opts.limit };
  }

  async findById(id: string, includeLinked = false): Promise<CardDto | null> {
    const row = await this.prisma.card.findUnique({
      where: { id, deletedAt: null },
      select: {
        ...CARD_SELECT,
        ...(includeLinked
          ? { products: { select: LINKED_PRODUCT_SELECT, orderBy: { createdAt: "asc" as const } } }
          : {}),
      },
    });
    return row ? mapCard(row) : null;
  }

  async create(data: {
    name: string;
    setName: string;
    cardNumber?: string | null;
    rarity?: string | null;
    type?: string | null;
    hp?: string | null;
    language: string;
    imageUrl?: string | null;
    description?: string | null;
    grade?: string | null;
    condition?: string | null;
    marketPrice?: number | null;
    population?: number | null;
    metadata?: Record<string, unknown> | null;
    setId?: string | null;
    grades?: Array<{ grade: string; gradingCompany?: string | null; certificationNumber?: string | null }>;
  }): Promise<CardDto> {
    const row = await this.prisma.card.create({
      data: {
        name: data.name,
        setName: data.setName,
        cardNumber: data.cardNumber ?? null,
        rarity: data.rarity ?? null,
        type: data.type ?? null,
        hp: data.hp ?? null,
        language: data.language,
        imageUrl: data.imageUrl ?? null,
        description: data.description ?? null,
        grade: data.grade ?? null,
        condition: data.condition ?? null,
        marketPrice: data.marketPrice ?? null,
        population: data.population ?? null,
        metadata: (data.metadata as any) ?? undefined,
        setId: data.setId ?? null,
        cardGrades: data.grades?.length
          ? { create: data.grades.map((g) => ({ grade: g.grade, gradingCompany: g.gradingCompany ?? null, certificationNumber: g.certificationNumber ?? null })) }
          : undefined,
      },
      select: CARD_SELECT,
    });
    return mapCard(row);
  }

  async update(id: string, data: {
    name?: string;
    setName?: string;
    cardNumber?: string | null;
    rarity?: string | null;
    type?: string | null;
    hp?: string | null;
    language?: string;
    imageUrl?: string | null;
    description?: string | null;
    grade?: string | null;
    condition?: string | null;
    marketPrice?: number | null;
    population?: number | null;
    metadata?: Record<string, unknown> | null;
    setId?: string | null;
  }): Promise<CardDto | null> {
    const row = await this.prisma.card.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.setName !== undefined ? { setName: data.setName } : {}),
        ...(data.cardNumber !== undefined ? { cardNumber: data.cardNumber ?? null } : {}),
        ...(data.rarity !== undefined ? { rarity: data.rarity ?? null } : {}),
        ...(data.type !== undefined ? { type: data.type ?? null } : {}),
        ...(data.hp !== undefined ? { hp: data.hp ?? null } : {}),
        ...(data.language !== undefined ? { language: data.language } : {}),
        ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl ?? null } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.grade !== undefined ? { grade: data.grade ?? null } : {}),
        ...(data.condition !== undefined ? { condition: data.condition ?? null } : {}),
        ...(data.marketPrice !== undefined ? { marketPrice: data.marketPrice ?? null } : {}),
        ...(data.population !== undefined ? { population: data.population ?? null } : {}),
        ...(data.metadata !== undefined ? { metadata: (data.metadata as any) ?? null } : {}),
        ...(data.setId !== undefined ? { setId: data.setId ?? null } : {}),
      },
      select: CARD_SELECT,
    });
    return row ? mapCard(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.card.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ---- Product<->Card links (card product references card WITHOUT duplicating metadata) ----

  async linkProduct(cardId: string, productId: string): Promise<void> {
    await this.prisma.productCardLink.create({
      data: { cardId, productId },
    });
  }

  async unlinkProduct(cardId: string, productId: string): Promise<void> {
    await this.prisma.productCardLink.deleteMany({
      where: { cardId, productId },
    });
  }
}
