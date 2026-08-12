import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SetDto } from "./sets.dto";

const SET_SELECT = {
  id: true,
  name: true,
  slug: true,
  series: true,
  releaseDate: true,
  totalCards: true,
  logoUrl: true,
  symbolUrl: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { cards: true } },
} as const;

function mapSet(row: any): SetDto {
  const { _count, ...rest } = row;
  return {
    ...rest,
    cardCount: _count?.cards ?? 0,
  };
}

@Injectable()
export class SetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SetDto[]> {
    const rows = await this.prisma.set.findMany({
      select: SET_SELECT,
      orderBy: { releaseDate: "desc" },
    });
    return rows.map(mapSet);
  }

  async findBySlugOrId(slugOrId: string): Promise<SetDto | null> {
    const row = await this.prisma.set.findFirst({
      where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
      select: SET_SELECT,
    });
    return row ? mapSet(row) : null;
  }

  async create(data: {
    name: string;
    slug: string;
    series?: string | null;
    releaseDate?: Date | null;
    totalCards: number;
    logoUrl?: string | null;
    symbolUrl?: string | null;
    description?: string | null;
  }): Promise<SetDto> {
    const row = await this.prisma.set.create({
      data: {
        name: data.name,
        slug: data.slug,
        series: data.series ?? null,
        releaseDate: data.releaseDate ?? null,
        totalCards: data.totalCards,
        logoUrl: data.logoUrl ?? null,
        symbolUrl: data.symbolUrl ?? null,
        description: data.description ?? null,
      },
      select: SET_SELECT,
    });
    return mapSet(row);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
      series?: string | null;
      releaseDate?: Date | null;
      totalCards: number;
      logoUrl?: string | null;
      symbolUrl?: string | null;
      description?: string | null;
    }>,
  ): Promise<SetDto | null> {
    const row = await this.prisma.set.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.series !== undefined ? { series: data.series ?? null } : {}),
        ...(data.releaseDate !== undefined ? { releaseDate: data.releaseDate ?? null } : {}),
        ...(data.totalCards !== undefined ? { totalCards: data.totalCards } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl ?? null } : {}),
        ...(data.symbolUrl !== undefined ? { symbolUrl: data.symbolUrl ?? null } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
      },
      select: SET_SELECT,
    });
    return row ? mapSet(row) : null;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.set.delete({ where: { id } });
  }
}
