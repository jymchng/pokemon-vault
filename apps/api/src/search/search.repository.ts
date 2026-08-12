import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SearchDto, SearchResult, SearchResultItem } from "./search.dto";

/**
 * Search abstraction (§46) — PostgreSQL full-text search today, swappable to
 * Meilisearch/OpenSearch later by replacing this repository with an adapter
 * implementing the same methods.
 *
 * Security: ALL user input goes through $1/$2... parameters (never string-
 * interpolated into SQL). The sort field is mapped through a whitelist; the
 * WHERE clauses are built from validated enum/coerced values only.
 */
@Injectable()
export class SearchRepository {
  constructor(private readonly prisma: PrismaService) {}

  private productWhere(query: SearchDto): { sql: string; params: unknown[] } {
    const conditions: string[] = [`p."deletedAt" IS NULL`];
    const params: unknown[] = [];
    if (query.q) {
      params.push(query.q);
      conditions.push(`(
        to_tsvector('english', p.name) ||
        to_tsvector('english', coalesce(p.sku,'')) ||
        to_tsvector('english', coalesce(p.description,'')) ||
        to_tsvector('english', coalesce(p.category,''))
      ) @@ plainto_tsquery('english', $${params.length})`);
    }
    if (query.category) {
      params.push(query.category);
      conditions.push(`p.category = $${params.length}`);
    }
    if (query.minPrice !== undefined) {
      params.push(query.minPrice);
      conditions.push(`p.price >= $${params.length}`);
    }
    if (query.maxPrice !== undefined) {
      params.push(query.maxPrice);
      conditions.push(`p.price <= $${params.length}`);
    }
    if (query.availability === "in_stock") {
      conditions.push(`EXISTS (SELECT 1 FROM "InventoryItem" i WHERE i."productId" = p.id AND i.status = 'AVAILABLE' AND i.quantity > i.reserved)`);
    }
    if (query.availability === "out_of_stock") {
      conditions.push(`NOT EXISTS (SELECT 1 FROM "InventoryItem" i WHERE i."productId" = p.id AND i.status = 'AVAILABLE' AND i.quantity > i.reserved)`);
    }
    return { sql: conditions.join(" AND "), params };
  }

  private cardWhere(query: SearchDto): { sql: string; params: unknown[] } {
    const conditions: string[] = [`c."deletedAt" IS NULL`];
    const params: unknown[] = [];
    if (query.q) {
      params.push(query.q);
      conditions.push(`(
        to_tsvector('english', c.name) ||
        to_tsvector('english', coalesce(c."setName",'')) ||
        to_tsvector('english', coalesce(c."cardNumber",'')) ||
        to_tsvector('english', coalesce(c.rarity,'')) ||
        to_tsvector('english', coalesce(c.type,''))
      ) @@ plainto_tsquery('english', $${params.length})`);
    }
    if (query.set) {
      params.push(query.set);
      conditions.push(`c."setName" = $${params.length}`);
    }
    if (query.rarity) {
      params.push(query.rarity);
      conditions.push(`c.rarity = $${params.length}`);
    }
    if (query.cardType) {
      params.push(query.cardType);
      conditions.push(`c.type = $${params.length}`);
    }
    if (query.grade) {
      params.push(query.grade);
      conditions.push(`c.grade = $${params.length}`);
    }
    return { sql: conditions.join(" AND "), params };
  }

  private orderBy(query: SearchDto): string {
    // Whitelist-only mapping — arbitrary input never reaches SQL.
    if (query.type === "cards") {
      switch (query.sort) {
        case "name_asc": return `c.name ASC`;
        case "number_asc": return `c."cardNumber" ASC NULLS LAST`;
        case "newest": return `c."createdAt" DESC`;
        default:
          return query.q
            ? `ts_rank_cd(to_tsvector('english', c.name || ' ' || coalesce(c."setName",'') || ' ' || coalesce(c.rarity,'')), plainto_tsquery('english', $1)) DESC`
            : `c."createdAt" DESC`;
      }
    }
    switch (query.sort) {
      case "price_asc": return `p.price ASC`;
      case "price_desc": return `p.price DESC`;
      case "name_asc": return `p.name ASC`;
      case "newest": return `p."createdAt" DESC`;
      default:
        return query.q
          ? `ts_rank_cd(to_tsvector('english', p.name || ' ' || coalesce(p.sku,'') || ' ' || coalesce(p.description,'')), plainto_tsquery('english', $1)) DESC`
          : `p."createdAt" DESC`;
    }
  }

  async searchProducts(query: SearchDto): Promise<SearchResult> {
    const { sql, params } = this.productWhere(query);
    const order = this.orderBy(query);
    const rows = await this.prisma.$queryRawUnsafe<SearchResultItem[]>(
      `SELECT p.id, p.name, p.slug, p.sku, p.price::float8 AS price, p.category, p."productType",
              p.status,
              (SELECT i.quantity - i.reserved FROM "InventoryItem" i WHERE i."productId" = p.id AND i.status = 'AVAILABLE' LIMIT 1) AS available
       FROM "Product" p
       WHERE ${sql}
       ORDER BY ${order}
       LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      ...params,
    );
    const count = await this.prisma.$queryRawUnsafe<Array<{ n: string }>>(
      `SELECT count(*)::text AS n FROM "Product" p WHERE ${sql}`,
      ...params,
    );
    return { items: rows, total: Number(count[0]?.n ?? 0), page: query.page, limit: query.limit };
  }

  async searchCards(query: SearchDto): Promise<SearchResult> {
    const { sql, params } = this.cardWhere(query);
    const order = this.orderBy(query);
    const rows = await this.prisma.$queryRawUnsafe<SearchResultItem[]>(
      `SELECT c.id, c.name, c."setName", c."cardNumber", c.rarity, c.type, c.grade
       FROM "Card" c
       WHERE ${sql}
       ORDER BY ${order}
       LIMIT ${query.limit} OFFSET ${(query.page - 1) * query.limit}`,
      ...params,
    );
    const count = await this.prisma.$queryRawUnsafe<Array<{ n: string }>>(
      `SELECT count(*)::text AS n FROM "Card" c WHERE ${sql}`,
      ...params,
    );
    return { items: rows, total: Number(count[0]?.n ?? 0), page: query.page, limit: query.limit };
  }

  async search(query: SearchDto): Promise<SearchResult> {
    return query.type === "cards" ? this.searchCards(query) : this.searchProducts(query);
  }
}
