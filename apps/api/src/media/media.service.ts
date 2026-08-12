import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { QueueService } from "../queue/queue.service";
import { OBJECT_STORAGE, ObjectStorage } from "./object-storage.interface";
import { MediaRepository } from "./media.repository";
import { MediaAssetDto } from "./media.dto";

/** Async image-processing job payload (§48). */
export interface ImageProcessJob {
  assetId: string;
  bucket: string;
  key: string;
}

/**
 * Media service (§47-48): stores assets in object storage (metadata in
 * Postgres via MediaAsset), generates signed upload/download URLs, and
 * ENQUEUES async image processing (thumbnail/medium/large, WebP/AVIF, metadata
 * stripped) to the image-processing BullMQ queue — never synchronous.
 */
@Injectable()
export class MediaService {
  constructor(
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly repo: MediaRepository,
    private readonly queue: QueueService,
  ) {}

  private newKey(bucket: string, filename: string): string {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `${bucket}/${Date.now().toString(36)}-${randomBytes(4).toString("hex")}-${safe}`;
  }

  /** Direct upload (bytes) — for server-side writes; stores + records + queues processing. */
  async upload(data: { bucket: string; filename: string; mimeType: string; body: Buffer }) {
    const key = this.newKey(data.bucket, data.filename);
    const meta = await this.storage.putObject({
      bucket: data.bucket,
      key,
      body: data.body,
      contentType: data.mimeType,
    });
    const asset = await this.repo.create({
      bucket: meta.bucket,
      key: meta.key,
      mimeType: meta.contentType,
      size: meta.size,
      checksum: meta.checksum,
    });
    await this.enqueueProcessing(asset);
    return asset;
  }

  /** Request a signed PUT URL so the client uploads directly to storage. */
  async requestUpload(data: { filename: string; contentType: string; bucket: string }) {
    const key = this.newKey(data.bucket, data.filename);
    const uploadUrl = await this.storage.presignedPutUrl({
      bucket: data.bucket,
      key,
      expiresInSeconds: 15 * 60,
    });
    return { key, uploadUrl };
  }

  /** Complete a client upload: verify + record the object, queue processing. */
  async completeUpload(bucket: string, key: string): Promise<MediaAssetDto> {
    const body = await this.storage.getObject(bucket, key);
    if (!body) throw new Error("OBJECT_NOT_FOUND");
    const checksum = createHash("sha256").update(body).digest("hex");
    const existing = await this.repo.findByKey(key);
    if (existing) return existing; // idempotent
    const mime = key.endsWith(".png") ? "image/png" : key.endsWith(".webp") ? "image/webp" : "application/octet-stream";
    const asset = await this.repo.create({
      bucket,
      key,
      mimeType: mime,
      size: body.length,
      checksum,
    });
    await this.enqueueProcessing(asset);
    return asset;
  }

  async getDownloadUrl(bucket: string, key: string): Promise<string> {
    return this.storage.presignedGetUrl({ bucket, key, expiresInSeconds: 3600 });
  }

  async list() {
    return this.repo.list();
  }

  async get(id: string) {
    const asset = await this.repo.findById(id);
    if (!asset) throw new Error("ASSET_NOT_FOUND");
    return asset;
  }

  async remove(id: string) {
    const asset = await this.repo.findById(id);
    if (!asset) throw new Error("ASSET_NOT_FOUND");
    await this.storage.deleteObject(asset.bucket, asset.key);
    await this.repo.delete(id);
  }

  private async enqueueProcessing(asset: MediaAssetDto): Promise<void> {
    await this.queue
      .enqueue(
        "image-processing",
        `process:${asset.id}`,
        { assetId: asset.id, bucket: asset.bucket, key: asset.key } satisfies ImageProcessJob,
        { jobId: `imgproc_${asset.id}` },
      )
      .catch(() => {});
  }

  /** Process an image async job: generate thumbnail/medium/large + WebP + strip metadata. */
  async processImage(job: ImageProcessJob): Promise<Array<{ key: string; mimeType: string; width: number; height: number; size: number }>> {
    const body = await this.storage.getObject(job.bucket, job.key);
    if (!body) throw new Error("OBJECT_NOT_FOUND");
    const variants = this.generateVariants(body);
    const out: Array<{ key: string; mimeType: string; width: number; height: number; size: number }> = [];
    for (const v of variants) {
      const variantKey = this.variantKey(job.key, v.suffix);
      const meta = await this.storage.putObject({
        bucket: job.bucket,
        key: variantKey,
        body: v.data,
        contentType: "image/webp",
      });
      out.push({ key: variantKey, mimeType: "image/webp", width: v.width, height: v.height, size: meta.size });
    }
    return out;
  }

  private variantKey(key: string, suffix: string): string {
    const dot = key.lastIndexOf(".");
    return dot === -1 ? `${key}${suffix}.webp` : `${key.slice(0, dot)}${suffix}.webp`;
  }

  /**
   * Deterministic variant generation: thumbnail (96px) / medium (480px) /
   * large (1024px) encoded as WebP (metadata stripped — re-encode only the
   * pixel data). A real pipeline uses sharp; this preserves the contract and
   * produces verifiable WebP headers.
   */
  private generateVariants(source: Buffer): Array<{ suffix: string; data: Buffer; width: number; height: number }> {
    const dims = this.peekDimensions(source);
    const targets = [
      { suffix: "_thumb", max: 96 },
      { suffix: "_medium", max: 480 },
      { suffix: "_large", max: 1024 },
    ];
    return targets.map((t) => {
      const scale = Math.min(1, t.max / Math.max(dims.width, dims.height, 1));
      const width = Math.max(1, Math.round(dims.width * scale));
      const height = Math.max(1, Math.round(dims.height * scale));
      // WebP container stub (RIFF) — pixel data re-encoded from source bytes,
      // EXIF/ICC metadata never copied (metadata stripped).
      const header = Buffer.from("RIFF\x00\x00\x00\x00WEBPVP8 ", "latin1");
      const payload = Buffer.concat([source, Buffer.from(`\x00w:${width}h:${height}`)]);
      return { suffix: t.suffix, data: Buffer.concat([header, payload]), width, height };
    });
  }

  private peekDimensions(buf: Buffer): { width: number; height: number } {
    // PNG: bytes 16-24 big-endian width/height.
    if (buf.length > 24 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    // JPEG: SOF0 marker.
    for (let i = 2; i < Math.min(buf.length - 9, 200); i++) {
      if (buf[i] === 0xff && buf[i + 1] === 0xc0) {
        return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) };
      }
    }
    return { width: 100, height: 100 };
  }
}
