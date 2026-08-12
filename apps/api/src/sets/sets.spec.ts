import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { SetsController } from "./sets.controller";
import { SetsService } from "./sets.service";
import { SetsRepository } from "./sets.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { slugifySet } from "./sets.service";

const passGuard = { canActivate: () => true };

class FakeSetsRepository {
  rows: any[] = [];
  seq = 0;

  async findAll() {
    return [...this.rows];
  }
  async findBySlugOrId(slugOrId: string) {
    return this.rows.find((r) => r.slug === slugOrId || r.id === slugOrId) ?? null;
  }
  async create(data: any) {
    if (this.rows.some((r) => r.slug === data.slug)) {
      const err: any = new Error("unique");
      err.code = "P2002";
      throw err;
    }
    const row = { id: `s${++this.seq}`, ...data, createdAt: new Date(), updatedAt: new Date(), cardCount: 0 };
    this.rows.push(row);
    return { ...row };
  }
  async update(id: string, data: any) {
    const row = this.rows.find((r) => r.id === id);
    if (!row) {
      const err: any = new Error("not found");
      err.code = "P2025";
      throw err;
    }
    if (data.slug && this.rows.some((r) => r.slug === data.slug && r.id !== id)) {
      const err: any = new Error("unique");
      err.code = "P2002";
      throw err;
    }
    Object.assign(row, data);
    return { ...row };
  }
  async remove(id: string) {
    const idx = this.rows.findIndex((r) => r.id === id);
    if (idx < 0) {
      const err: any = new Error("not found");
      err.code = "P2025";
      throw err;
    }
    this.rows.splice(idx, 1);
  }
}

async function makeModule(repo: FakeSetsRepository) {
  return Test.createTestingModule({
    controllers: [SetsController],
    providers: [SetsService, { provide: SetsRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

describe("G10 sets module", () => {
  it("lists sets", async () => {
    const repo = new FakeSetsRepository();
    await repo.create({ name: "Pokémon 151", slug: "sv151", series: "Scarlet & Violet", totalCards: 207 });
    const mod = await makeModule(repo);
    const res = await mod.get(SetsController).index();
    expect(res.data).toHaveLength(1);
    expect(res.data[0].slug).toBe("sv151");
  });

  it("creates a set with auto-slug", async () => {
    const repo = new FakeSetsRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(SetsController).create({ name: "Obsidian Flames!", totalCards: 230 } as any);
    expect(res.data.slug).toBe("obsidian-flames");
  });

  it("rejects duplicate slug", async () => {
    const repo = new FakeSetsRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(SetsController);
    await ctrl.create({ name: "Obsidian Flames", totalCards: 1 } as any);
    await expect(ctrl.create({ name: "Obsidian Flames", totalCards: 1 } as any)).rejects.toMatchObject({ status: 409 });
  });

  it("gets by slug and 404s for unknown", async () => {
    const repo = new FakeSetsRepository();
    await repo.create({ name: "151", slug: "sv151", totalCards: 207 });
    const mod = await makeModule(repo);
    const ctrl = mod.get(SetsController);
    expect((await ctrl.show("sv151")).data.slug).toBe("sv151");
    await expect(ctrl.show("nope")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("updates and deletes a set", async () => {
    const repo = new FakeSetsRepository();
    await repo.create({ name: "151", slug: "sv151", totalCards: 207 });
    const mod = await makeModule(repo);
    const ctrl = mod.get(SetsController);
    const upd = await ctrl.update("sv151", { totalCards: 250 } as any);
    expect(upd.data.totalCards).toBe(250);
    await ctrl.remove("sv151");
    expect(repo.rows).toHaveLength(0);
  });

  it("slugifySet normalizes", () => {
    expect(slugifySet("Scarlet & Violet")).toBe("scarlet-violet");
  });
});
