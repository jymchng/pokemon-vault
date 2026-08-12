import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MediaAssetDto } from "./media.dto";

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    bucket: string;
    key: string;
    mimeType: string;
    size: number;
    width?: number | null;
    height?: number | null;
    checksum?: string | null;
  }): Promise<MediaAssetDto> {
    const row = await this.prisma.mediaAsset.create({
      data: {
        bucket: data.bucket,
        key: data.key,
        mimeType: data.mimeType,
        size: data.size,
        width: data.width ?? null,
        height: data.height ?? null,
        checksum: data.checksum ?? null,
      },
    });
    return this.map(row);
  }

  async findById(id: string): Promise<MediaAssetDto | null> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findByKey(key: string): Promise<MediaAssetDto | null> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { key } });
    return row ? this.map(row) : null;
  }

  async list(limit = 50): Promise<MediaAssetDto[]> {
    const rows = await this.prisma.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(this.map);
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.prisma.mediaAsset.deleteMany({ where: { id } });
    return res.count === 1;
  }

  private map(row: any): MediaAssetDto {
    return {
      id: row.id,
      bucket: row.bucket,
      key: row.key,
      mimeType: row.mimeType,
      size: row.size,
      width: row.width,
      height: row.height,
      checksum: row.checksum,
      createdAt: row.createdAt,
    };
  }
}
