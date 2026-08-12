import { createHash } from "node:crypto";
import {
  ObjectMeta,
  ObjectStorage,
  PresignedUrlInput,
  PutObjectInput,
} from "../object-storage.interface";

/**
 * In-memory object storage for local development / tests — mirrors the MinIO/S3
 * contract (put/get/presigned URLs/delete). Real MinIO (local) and S3 (prod)
 * implement the same interface via the OBJECT_STORAGE env.
 */
export class MemoryObjectStorage implements ObjectStorage {
  readonly name = "memory";
  private store = new Map<string, Buffer>();
  private urls = new Map<string, string>();

  async putObject(input: PutObjectInput): Promise<ObjectMeta> {
    const checksum = createHash("sha256").update(input.body).digest("hex");
    this.store.set(`${input.bucket}/${input.key}`, input.body);
    this.urls.set(`${input.bucket}/${input.key}`, `mem://${input.bucket}/${input.key}`);
    return {
      bucket: input.bucket,
      key: input.key,
      size: input.body.length,
      contentType: input.contentType,
      checksum,
    };
  }

  async getObject(bucket: string, key: string): Promise<Buffer | null> {
    return this.store.get(`${bucket}/${key}`) ?? null;
  }

  async presignedPutUrl(input: PresignedUrlInput): Promise<string> {
    return `${this.urls.get(`${input.bucket}/${input.key}`) ?? `mem://${input.bucket}/${input.key}`}?method=PUT&expires=${input.expiresInSeconds}`;
  }

  async presignedGetUrl(input: PresignedUrlInput): Promise<string> {
    return `${this.urls.get(`${input.bucket}/${input.key}`) ?? `mem://${input.bucket}/${input.key}`}?method=GET&expires=${input.expiresInSeconds}`;
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    this.store.delete(`${bucket}/${key}`);
    this.urls.delete(`${bucket}/${key}`);
  }
}
