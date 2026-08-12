import { Injectable } from "@nestjs/common";
import { MediaDto } from "./media.dto";

@Injectable()
export class MediaRepository {
  /** Data access boundary. G4+ wires Prisma/Postgres here. */
  async findAll(): Promise<MediaDto[]> {
    return [];
  }
}
