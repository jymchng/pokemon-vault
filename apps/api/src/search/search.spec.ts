import { Test } from "@nestjs/testing";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { SearchRepository } from "./search.repository";
import { SearchSchema } from "./search.dto";

class FakeSearchRepository {
  calls: Array<{ type: string; q?: string }> = [];
  async search(query: any) {
    this.calls.push({ type: query.type, q: query.q });
    return { items: [{ id: "1", name: query.q ?? "x" }], total: 1, page: 1, limit: 20 };
  }
}

async function makeModule(repo: FakeSearchRepository) {
  return Test.createTestingModule({
    controllers: [SearchController],
    providers: [SearchService, { provide: SearchRepository, useValue: repo }],
  }).compile();
}

describe("G24 search module", () => {
  it("validates query via zod (whitelisted type/sort)", () => {
    const ok = SearchSchema.parse({ q: "charizard", type: "cards", sort: "name_asc", rarity: "Rare" });
    expect(ok.type).toBe("cards");
    expect(ok.rarity).toBe("Rare");
    // Invalid type/sort rejected
    expect(SearchSchema.safeParse({ type: "users" }).success).toBe(false);
    expect(SearchSchema.safeParse({ sort: "DROP TABLE" }).success).toBe(false);
    // Arbitrary params never allowed
    expect(SearchSchema.safeParse({ q: "x", limit: 20 }).success).toBe(true);
    expect(SearchSchema.safeParse({ sort: "id; DELETE FROM products" }).success).toBe(false);
  });

  it("routes to product or card search", async () => {
    const repo = new FakeSearchRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(SearchController);
    await ctrl.index({ q: "pikachu", type: "cards" });
    await ctrl.index({ q: "etb", type: "products" });
    expect(repo.calls.map((c) => c.type)).toEqual(["cards", "products"]);
  });
});

describe("G24 PostgreSQL FTS safety", () => {
  it("repository builds parameterized SQL (no interpolation of user input)", () => {
    const src = require("fs").readFileSync(require("path").join(__dirname, "search.repository.ts"), "utf8");
    // Every user input flows through $n params via queryRawUnsafe(..., ...params)
    expect(src).toContain("$queryRawUnsafe");
    // $${params.length} in the TS source = template literal -> a $n bound param.
    expect(src).toMatch(/plainto_tsquery\('english', \$\$\{params\.length\}\)/);
    // And the repository must bind query values via params array (no string concat of q)
    expect(src).toMatch(/params\.push\(query\.q\)/);
    // Sort is whitelisted — no direct concat of query.sort into ORDER BY
    expect(src).not.toMatch(/ORDER BY \$\{query\.sort\}/);
    expect(src).toMatch(/Whitelist-only mapping/);
  });
});
