import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ProductDto, ProductListResult, ProductVariantDto } from "./products.dto";

const num = (v: unknown): number | null => (v == null ? null : Number(v));
const json = (v: unknown): Record<string, unknown> | null =>
  v == null ? null : (v as Record<string, unknown>);

const VARIANT_SELECT = {
  id: true,
  sku: true,
  name: true,
  price: true,
  cost: true,
  barcode: true,
  weight: true,
  status: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
} as const;

const PRODUCT_SELECT = {
  id: true,
  sku: true,
  slug: true,
  name: true,
  description: true,
  category: true,
  productType: true,
  price: true,
  compareAt: true,
  currency: true,
  status: true,
  weight: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
  variants: { select: VARIANT_SELECT, orderBy: { createdAt: "asc" as const } },
} as const;

function mapVariant(row: any): ProductVariantDto {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    price: Number(row.price),
    cost: num(row.cost),
    barcode: row.barcode,
    weight: num(row.weight),
    status: row.status,
    metadata: json(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapProduct(row: any): ProductDto {
  return {
    id: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    productType: row.productType,
    price: Number(row.price),
    compareAt: num(row.compareAt),
    currency: row.currency,
    status: row.status,
    weight: num(row.weight),
    metadata: json(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    variants: (row.variants ?? []).map(mapVariant),
  };
}

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(opts: {
    category?: string;
    productType?: string;
    status?: string;
    search?: string;
    page: number;
    limit: number;
    includeDraft?: boolean;
  }): Promise<ProductListResult> {
    const where: any = { deletedAt: null };
    if (!opts.includeDraft) where.status = "ACTIVE";
    if (opts.status && opts.includeDraft) where.status = opts.status;
    if (opts.category) where.category = opts.category;
    if (opts.productType) where.productType = opts.productType;
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: "insensitive" } },
        { sku: { contains: opts.search, mode: "insensitive" } },
        { slug: { contains: opts.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: rows.map(mapProduct), total, page: opts.page, limit: opts.limit };
  }

  async findBySlugOrId(slugOrId: string, includeDraft = false): Promise<ProductDto | null> {
    const row = await this.prisma.product.findFirst({
      where: {
        deletedAt: null,
        ...(includeDraft ? {} : { status: "ACTIVE" }),
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
      select: PRODUCT_SELECT,
    });
    return row ? mapProduct(row) : null;
  }

  async create(data: {
    sku: string;
    slug: string;
    name: string;
    description?: string | null;
    category?: string | null;
    productType: string;
    price: number;
    compareAt?: number | null;
    currency: string;
    status: string;
    weight?: number | null;
    metadata?: Record<string, unknown> | null;
    variants?: Array<{
      sku: string;
      name: string;
      price: number;
      cost?: number | null;
      barcode?: string | null;
      weight?: number | null;
      status: string;
      metadata?: Record<string, unknown> | null;
    }>;
  }): Promise<ProductDto> {
    const row = await this.prisma.product.create({
      data: {
        sku: data.sku,
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        category: data.category ?? null,
        productType: data.productType as any,
        price: data.price,
        compareAt: data.compareAt ?? null,
        currency: data.currency,
        status: data.status as any,
        weight: data.weight ?? null,
        metadata: (data.metadata as any) ?? undefined,
        variants: data.variants?.length
          ? {
              create: data.variants.map((v) => ({
                sku: v.sku,
                name: v.name,
                price: v.price,
                cost: v.cost ?? null,
                barcode: v.barcode ?? null,
                weight: v.weight ?? null,
                status: v.status,
                metadata: (v.metadata as any) ?? undefined,
              })),
            }
          : undefined,
      },
      select: PRODUCT_SELECT,
    });
    return mapProduct(row);
  }

  async update(
    id: string,
    data: {
      sku?: string;
      slug?: string;
      name?: string;
      description?: string | null;
      category?: string | null;
      productType?: string;
      price?: number;
      compareAt?: number | null;
      currency?: string;
      status?: string;
      weight?: number | null;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<ProductDto | null> {
    const row = await this.prisma.product.update({
      where: { id },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description ?? null } : {}),
        ...(data.category !== undefined ? { category: data.category ?? null } : {}),
        ...(data.productType !== undefined ? { productType: data.productType as any } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.compareAt !== undefined ? { compareAt: data.compareAt ?? null } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
        ...(data.status !== undefined ? { status: data.status as any } : {}),
        ...(data.weight !== undefined ? { weight: data.weight ?? null } : {}),
        ...(data.metadata !== undefined ? { metadata: (data.metadata as any) ?? null } : {}),
      },
      select: PRODUCT_SELECT,
    });
    return row ? mapProduct(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---- Variants ----

  async addVariant(
    productId: string,
    data: {
      sku: string;
      name: string;
      price: number;
      cost?: number | null;
      barcode?: string | null;
      weight?: number | null;
      status: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<ProductVariantDto | null> {
    const row = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: data.sku,
        name: data.name,
        price: data.price,
        cost: data.cost ?? null,
        barcode: data.barcode ?? null,
        weight: data.weight ?? null,
        status: data.status,
        metadata: (data.metadata as any) ?? undefined,
      },
      select: VARIANT_SELECT,
    });
    return row ? mapVariant(row) : null;
  }

  async updateVariant(
    variantId: string,
    data: {
      sku?: string;
      name?: string;
      price?: number;
      cost?: number | null;
      barcode?: string | null;
      weight?: number | null;
      status?: string;
      metadata?: Record<string, unknown> | null;
    },
  ): Promise<ProductVariantDto | null> {
    const row = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(data.sku !== undefined ? { sku: data.sku } : {}),
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.price !== undefined ? { price: data.price } : {}),
        ...(data.cost !== undefined ? { cost: data.cost ?? null } : {}),
        ...(data.barcode !== undefined ? { barcode: data.barcode ?? null } : {}),
        ...(data.weight !== undefined ? { weight: data.weight ?? null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.metadata !== undefined ? { metadata: (data.metadata as any) ?? null } : {}),
      },
      select: VARIANT_SELECT,
    });
    return row ? mapVariant(row) : null;
  }

  async deleteVariant(variantId: string): Promise<void> {
    await this.prisma.productVariant.delete({ where: { id: variantId } });
  }
}
