import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SetsRepository } from "./sets.repository";
import { CreateSetDto, SetDto, UpdateSetDto } from "./sets.dto";

/** Slugify a set name (fallback for omitted slug). */
export function slugifySet(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 190);
}

@Injectable()
export class SetsService {
  constructor(private readonly repo: SetsRepository) {}

  async list(): Promise<SetDto[]> {
    return this.repo.findAll();
  }

  async getBySlugOrId(slugOrId: string): Promise<SetDto> {
    const set = await this.repo.findBySlugOrId(slugOrId);
    if (!set) throw new NotFoundException("Set not found");
    return set;
  }

  async create(input: CreateSetDto): Promise<SetDto> {
    const slug = input.slug ?? slugifySet(input.name);
    if (!slug) throw new Error("slug required");
    try {
      return await this.repo.create({ ...input, slug });
    } catch (err: any) {
      if (err?.code === "P2002") throw new ConflictException("Slug already exists");
      throw err;
    }
  }

  async update(slugOrId: string, input: UpdateSetDto): Promise<SetDto> {
    try {
      const set = await this.repo.findBySlugOrId(slugOrId);
      if (!set) throw new NotFoundException("Set not found");
      const updated = await this.repo.update(set.id, input);
      if (!updated) throw new NotFoundException("Set not found");
      return updated;
    } catch (err: any) {
      if (err?.code === "P2002") throw new ConflictException("Slug already exists");
      throw err;
    }
  }

  async remove(slugOrId: string): Promise<void> {
    const set = await this.repo.findBySlugOrId(slugOrId);
    if (!set) throw new NotFoundException("Set not found");
    await this.repo.remove(set.id);
  }
}
