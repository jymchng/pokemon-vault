import { Test } from "@nestjs/testing";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { MediaRepository } from "./media.repository";
import { MemoryObjectStorage } from "./providers/memory.storage";
import { OBJECT_STORAGE } from "./object-storage.interface";
import { QueueService } from "../queue/queue.service";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };
const fakeQueue = { enqueue: async () => "job1" } as unknown as QueueService;

class FakeMediaRepository {
  rows: any[] = [];
  seq = 0;
  async create(data: any) {
    const row = { id: `m${++this.seq}`, createdAt: new Date(), ...data };
    this.rows.push(row);
    return row;
  }
  async findById(id: string) { return this.rows.find((r) => r.id === id) ?? null; }
  async findByKey(key: string) { return this.rows.find((r) => r.key === key) ?? null; }
  async list() { return this.rows; }
  async delete(id: string) {
    const before = this.rows.length;
    this.rows = this.rows.filter((r) => r.id !== id);
    return before !== this.rows.length;
  }
}

async function makeModule(repo: FakeMediaRepository) {
  const storage = new MemoryObjectStorage();
  return Test.createTestingModule({
    controllers: [MediaController],
    providers: [
      MediaService,
      { provide: MediaRepository, useValue: repo },
      { provide: OBJECT_STORAGE, useValue: storage },
      { provide: QueueService, useValue: fakeQueue },
    ],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

const req = () => ({ user: { id: "u1", sessionId: "s" } });

describe("G25 media module", () => {
  it("uploads bytes, records MediaAsset (bucket/key/mime/size/checksum), queues processing", async () => {
    const repo = new FakeMediaRepository();
    const mod = await makeModule(repo);
    const svc = mod.get(MediaService);
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), Buffer.alloc(4), Buffer.alloc(4), Buffer.from("data")]);
    const asset = await svc.upload({ bucket: "b", filename: "card.png", mimeType: "image/png", body: png });
    expect(asset.bucket).toBe("b");
    expect(asset.key).toContain("card.png");
    expect(asset.mimeType).toBe("image/png");
    expect(asset.size).toBe(png.length);
    expect(asset.checksum).toMatch(/^[0-9a-f]{64}$/);
    expect(repo.rows).toHaveLength(1);
  });

  it("generates signed upload URL (client direct upload)", async () => {
    const repo = new FakeMediaRepository();
    const mod = await makeModule(repo);
    const svc = mod.get(MediaService);
    const res = await svc.requestUpload({ filename: "x.webp", contentType: "image/webp", bucket: "b" });
    expect(res.key).toContain("x.webp");
    expect(res.uploadUrl).toContain("method=PUT");
    expect(res.uploadUrl).toContain("expires=");
  });

  it("completeUpload records the object + queues image processing (idempotent)", async () => {
    const repo = new FakeMediaRepository();
    const mod = await makeModule(repo);
    const svc = mod.get(MediaService);
    const body = Buffer.from("fake-image-bytes");
    const req2 = await svc.requestUpload({ filename: "a.png", contentType: "image/png", bucket: "b" });
    // Simulate client PUT into storage
    const storage = mod.get<MemoryObjectStorage>(OBJECT_STORAGE);
    await storage.putObject({ bucket: "b", key: req2.key, body, contentType: "image/png" });
    const asset = await svc.completeUpload("b", req2.key);
    expect(asset.size).toBe(body.length);
    expect(asset.checksum).toMatch(/^[0-9a-f]{64}$/);
    const again = await svc.completeUpload("b", req2.key);
    expect(again.id).toBe(asset.id); // idempotent
  });

  it("async image processing generates thumbnail/medium/large WebP variants (metadata stripped)", async () => {
    const repo = new FakeMediaRepository();
    const mod = await makeModule(repo);
    const svc = mod.get(MediaService);
    // 200x100 PNG
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]),
      Buffer.from([0, 0, 0, 200]), // width 200
      Buffer.from([0, 0, 0, 100]), // height 100
      Buffer.from("png-data"),
    ]);
    const asset = await svc.upload({ bucket: "b", filename: "card.png", mimeType: "image/png", body: png });
    const variants = await svc.processImage({ assetId: asset.id, bucket: asset.bucket, key: asset.key });
    expect(variants).toHaveLength(3);
    const [thumb, medium, large] = variants;
    expect(thumb.key.endsWith("_thumb.webp")).toBe(true);
    expect(medium.key.endsWith("_medium.webp")).toBe(true);
    expect(large.key.endsWith("_large.webp")).toBe(true);
    expect(thumb.width).toBeLessThanOrEqual(96);
    expect(medium.width).toBeLessThanOrEqual(480);
    expect(large.width).toBeLessThanOrEqual(1024);
    for (const v of variants) {
      expect(v.mimeType).toBe("image/webp");
      // The stored variant bytes start with the WebP RIFF header.
      const stored = await (mod.get<MemoryObjectStorage>(OBJECT_STORAGE)).getObject("b", v.key);
      expect(stored).toBeTruthy();
      expect(stored!.subarray(0, 4).toString("latin1")).toBe("RIFF");
    }
  });

  it("signed download URL + delete", async () => {
    const repo = new FakeMediaRepository();
    const mod = await makeModule(repo);
    const svc = mod.get(MediaService);
    const asset = await svc.upload({ bucket: "b", filename: "y.png", mimeType: "image/png", body: Buffer.from("x") });
    const url = await svc.getDownloadUrl(asset.bucket, asset.key);
    expect(url).toContain("method=GET");
    await svc.remove(asset.id);
    expect(repo.rows).toHaveLength(0);
  });
});
