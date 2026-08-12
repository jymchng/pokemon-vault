import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { PackDto, PackOpeningDto } from "./packs.dto";

/** Current server-side randomization algorithm version (audit field). */
export const RANDOMIZATION_VERSION = 1;

function mapPack(row: any): PackDto {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    price: Number(row.price),
    cardsPerPack: row.cardsPerPack,
    image: row.image,
    availability: row.availability,
    description: row.description,
    setName: row.setName,
  };
}

function mapOpening(row: any): PackOpeningDto {
  return {
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    userId: row.userId,
    packId: row.packId,
    packName: row.pack?.name ?? "",
    randomizationVersion: row.randomizationVersion,
    createdAt: row.createdAt,
    cards: (row.cards ?? []).map((c: any) => ({
      id: c.id,
      cardId: c.cardId,
      cardName: c.card?.name ?? "",
      cardNumber: c.card?.cardNumber ?? null,
      rarity: c.card?.rarity ?? null,
      type: c.card?.type ?? null,
    })),
  };
}

@Injectable()
export class PacksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<PackDto[]> {
    const rows = await this.prisma.pack.findMany({ orderBy: { name: "asc" } });
    return rows.map(mapPack);
  }

  async findBySlugOrId(slugOrId: string): Promise<PackDto | null> {
    const row = await this.prisma.pack.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
    });
    return row ? mapPack(row) : null;
  }

  /**
   * Load the card pool for a pack: cards in the pack's set (fallback: all
   * cards) grouped by rarity. Rarity distribution is computed server-side.
   */
  async loadCardPool(pack: PackDto): Promise<Array<{ id: string; rarity: string | null }>> {
    const where = pack.setName
      ? { setName: pack.setName, deletedAt: null }
      : { deletedAt: null };
    const cards = await this.prisma.card.findMany({
      where,
      select: { id: true, rarity: true },
    });
    return cards;
  }

  /** Find an existing opening by idempotency key (replay → same result). */
  async findOpeningByIdempotencyKey(key: string): Promise<PackOpeningDto | null> {
    const row = await this.prisma.packOpening.findUnique({
      where: { idempotencyKey: key },
      include: { pack: { select: { name: true } }, cards: { include: { card: true } } },
    });
    return row ? mapOpening(row) : null;
  }

  /** Atomically create the immutable opening + generated cards. */
  async createOpening(data: {
    idempotencyKey: string;
    userId: string;
    packId: string;
    cardIds: string[];
  }): Promise<PackOpeningDto> {
    // §93: atomic pack opening — opening + cards are created in ONE
    // transaction so a partial failure can never leave a pack consumed
    // without its cards (or vice versa).
    const row = await this.prisma.$transaction(async (tx) => {
      const opening = await tx.packOpening.create({
        data: {
          idempotencyKey: data.idempotencyKey,
          userId: data.userId,
          packId: data.packId,
          randomizationVersion: RANDOMIZATION_VERSION,
        },
      });
      await tx.packCard.createMany({
        data: data.cardIds.map((cardId) => ({ openingId: opening.id, cardId })),
      });
      return tx.packOpening.findUniqueOrThrow({
        where: { id: opening.id },
        include: { pack: { select: { name: true } }, cards: { include: { card: true } } },
      });
    });
    return mapOpening(row);
  }

  async findOpeningById(id: string): Promise<PackOpeningDto | null> {
    const row = await this.prisma.packOpening.findUnique({
      where: { id },
      include: { pack: { select: { name: true } }, cards: { include: { card: true } } },
    });
    return row ? mapOpening(row) : null;
  }

  async listOpeningsForUser(userId: string): Promise<PackOpeningDto[]> {
    const rows = await this.prisma.packOpening.findMany({
      where: { userId },
      include: { pack: { select: { name: true } }, cards: { include: { card: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return rows.map(mapOpening);
  }
}
