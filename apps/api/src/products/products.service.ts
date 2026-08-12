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
  constructor(private readonly repo: ProductsRepository) {}

  /** Public catalog: only ACTIVE, non-deleted products. */
  /** Public catalog — cursor pagination (§86). */
  async list(query: ProductQueryDto & { cursor?: string }): Promise<{
    items: ProductDto[];
    meta: CursorPageMeta;
  }> {
    return this.repo.findAllCursor({
      category: query.category,
      productType: query.productType,
      search: query.search,
      cursor: query.cursor,
      limit: query.limit,
    });
  }

  /** Staff+ view: includes DRAFT/ARCHIVED products. */
  async listAdmin(query: ProductQueryDto): Promise<ProductListResult> {
    return this.repo.findAll({ ...query, includeDraft: true });
  }

  async getBySlugOrId(slugOrId: string, includeDraft = false): Promise<ProductDto> {
    const product = await this.repo.findBySlugOrId(slugOrId, includeDraft);
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async create(input: CreateProductDto): Promise<ProductDto> {
    const slug = input.slug ?? slugify(input.name);
    if (!slug) throw new BadRequestException("A valid slug or name is required");
    try {
      return await this.repo.create({ ...input, slug });
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
    if (!product) throw new NotFoundException("Product not found");
    return product.id;
  }

  async update(slugOrId: string, input: UpdateProductDto): Promise<ProductDto> {
    try {
      const id = await this.resolveProductId(slugOrId);
      const product = await this.repo.update(id, input);
      if (!product) throw new NotFoundException("Product not found");
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
