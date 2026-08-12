import { Injectable } from "@nestjs/common";
import { MediaRepository } from "./media.repository";
import { MediaDto } from "./media.dto";

@Injectable()
export class MediaService {
  constructor(private readonly repo: MediaRepository) {}

  /** Business logic belongs here, never in the controller. */
  async list(): Promise<MediaDto[]> {
    return this.repo.findAll();
  }
}
