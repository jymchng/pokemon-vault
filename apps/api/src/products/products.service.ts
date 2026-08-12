import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CreateProductDto,
  ProductDto,
  ProductListResult,
  ProductQueryDto,
  ProductVariantDto,
  UpdateProductDto,
  UpdateVariantDto,
} from "./products.dto";
import { ProductsRepository } from "./products.repository";
import { CursorPageMeta } from "../common/cursor-pagination";
import { CacheService } from "../common/cache.service";
import { err as AppErrors } from "../common/app-error";

/** Slugify a product name (fallback for omitted slug). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 190);
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly repo: ProductsRepository,
    private readonly cache: CacheService,
  ) {}

  /** Public catalog: only ACTIVE, non-deleted products. */
  /** Public catalog — cursor pagination (§86). */
  async list(query: ProductQueryDto & { cursor?: string }): Promise<{
    items: ProductDto[];
    meta: CursorPageMeta;
  }> {
    // §94: hot products cache — TTL 60s; invalidated on product mutations.
    const cacheKey = `list:${query.category ?? ""}:${query.productType ?? ""}:${query.sort ?? ""}:${query.cursor ?? ""}:${query.limit}`;
    const cached = await this.cache.get<{ items: ProductDto[]; meta: CursorPageMeta }>("hot-products", cacheKey);
    if (cached) return cached;
    const result = await this.repo.findAllCursor({
      category: query.category,
      productType: query.productType,
      search: query.search,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      availability: query.availability,
      sort: query.sort,
      cursor: query.cursor,
      limit: query.limit,
    });
    await this.cache.set("hot-products", cacheKey, result, 60);
    return result;
  }

  /** Invalidate the hot-products cache (called on product create/update). */
  async invalidateProductsCache(): Promise<void> {
    await this.cache.delScope("hot-products");
  }

  /** Staff+ view: includes DRAFT/ARCHIVED products. */
  async listAdmin(query: ProductQueryDto): Promise<ProductListResult> {
    return this.repo.findAll({ ...query, includeDraft: true });
  }

  async getBySlugOrId(slugOrId: string, includeDraft = false): Promise<ProductDto> {
    const product = await this.repo.findBySlugOrId(slugOrId, includeDraft);
    if (!product) throw AppErrors.productNotFound();
    return product;
  }

  async create(input: CreateProductDto): Promise<ProductDto> {
    const slug = input.slug ?? slugify(input.name);
    if (!slug) throw new BadRequestException("A valid slug or name is required");
    try {
      const product = await this.repo.create({ ...input, slug });
      await this.invalidateProductsCache(); // §94: cache invalidation on mutation
      return product;
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw new ConflictException("SKU or slug already exists");
      }
      throw err;
    }
  }

  /** Resolve a product id from either its UUID or slug (draft-aware). */
  private async resolveProductId(slugOrId: string): Promise<string> {
    const product = await this.repo.findBySlugOrId(slugOrId, true);
    if (!product) throw AppErrors.productNotFound();
    return product.id;
  }

  async update(slugOrId: string, input: UpdateProductDto): Promise<ProductDto> {
    try {
      const id = await this.resolveProductId(slugOrId);
      const product = await this.repo.update(id, input);
      if (!product) throw AppErrors.productNotFound();
      await this.invalidateProductsCache(); // §94: cache invalidation on mutation
      return product;
    } catch (err: any) {
      if (err?.code === "P2025") throw new NotFoundException("Product not found");
      if (err?.code === "P2002") throw new ConflictException("SKU or slug already exists");
      throw err;
    }
  }

  async remove(slugOrId: string): Promise<void> {
    try {
      const id = await this.resolveProductId(slugOrId);
      await this.repo.softDelete(id);
    } catch (err: any) {
      if (err?.code === "P2025") throw new NotFoundException("Product not found");
      throw err;
    }
  }

  async addVariant(
    slugOrId: string,
    input: UpdateVariantDto & { sku: string; name: string; price: number },
  ): Promise<ProductVariantDto> {
    const productId = await this.resolveProductId(slugOrId);
    try {
      const variant = await this.repo.addVariant(productId, {
        ...input,
        status: input.status ?? "ACTIVE",
      });
      if (!variant) throw new NotFoundException("Product not found");
      return variant;
    } catch (err: any) {
      if (err?.code === "P2002") throw new ConflictException("Variant SKU already exists");
      throw err;
    }
  }

  async updateVariant(variantId: string, input: UpdateVariantDto): Promise<ProductVariantDto> {
    try {
      const variant = await this.repo.updateVariant(variantId, input);
      if (!variant) throw new NotFoundException("Variant not found");
      return variant;
    } catch (err: any) {
      if (err?.code === "P2025") throw new NotFoundException("Variant not found");
      if (err?.code === "P2002") throw new ConflictException("Variant SKU already exists");
      throw err;
    }
  }

  async removeVariant(variantId: string): Promise<void> {
    try {
      await this.repo.deleteVariant(variantId);
    } catch (err: any) {
      if (err?.code === "P2025") throw new NotFoundException("Variant not found");
      throw err;
    }
  }
}
