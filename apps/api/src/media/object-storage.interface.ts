/** Object-storage abstraction (§47) — MinIO locally, S3 in production. */

export interface PutObjectInput {
  bucket: string;
  key: string;
  body: Buffer;
  contentType: string;
}

export interface ObjectMeta {
  bucket: string;
  key: string;
  size: number;
  contentType: string;
  checksum: string; // sha256 of the bytes
}

export interface PresignedUrlInput {
  bucket: string;
  key: string;
  expiresInSeconds: number;
}

export interface ObjectStorage {
  readonly name: string; // "minio" | "s3" | "memory"
  putObject(input: PutObjectInput): Promise<ObjectMeta>;
  getObject(bucket: string, key: string): Promise<Buffer | null>;
  presignedPutUrl(input: PresignedUrlInput): Promise<string>;
  presignedGetUrl(input: PresignedUrlInput): Promise<string>;
  deleteObject(bucket: string, key: string): Promise<void>;
}

export const OBJECT_STORAGE = "OBJECT_STORAGE";
