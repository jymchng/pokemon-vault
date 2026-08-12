import { z } from "zod";

export interface MediaAssetDto {
  id: string;
  bucket: string;
  key: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  checksum: string | null;
  createdAt: Date;
  variants?: Array<{ key: string; mimeType: string; width: number | null; height: number | null; size: number }>;
}

export const UploadMediaSchema = z.object({
  bucket: z.string().min(1).max(100).default("pokemon-vault"),
});

export const RequestUploadSchema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(100),
  bucket: z.string().min(1).max(100).default("pokemon-vault"),
});

export type UploadMediaDto = z.infer<typeof UploadMediaSchema>;
export type RequestUploadDto = z.infer<typeof RequestUploadSchema>;
