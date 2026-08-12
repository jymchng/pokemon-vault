import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { OrderDto, OrderQueryDto } from "./orders.dto";

export interface OrderListResult {
  items: OrderDto[];
  total: number;
  page: number;
  limit: number;
}

const ORDER_SELECT = {
  id: true,
  orderNumber: true,
  userId: true,
  email: true,
  status: true,
  subtotal: true,
  discount: true,
  shipping: true,
  tax: true,
  total: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      sku: true,
      unitPrice: true,
      quantity: true,
      tax: true,
      discount: true,
      metadata: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

function mapOrder(row: any): OrderDto {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    userId: row.userId,
    email: row.email,
    status: row.status,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    shipping: Number(row.shipping),
    tax: Number(row.tax),
    total: Number(row.total),
    currency: row.currency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    items: (row.items ?? []).map((i: any) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      sku: i.sku,
      unitPrice: Number(i.unitPrice),
      quantity: i.quantity,
      tax: Number(i.tax),
      discount: Number(i.discount),
      metadata: (i.metadata as Record<string, unknown> | null) ?? null,
    })),
  };
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** User-scoped list (owner only). */
  async findForUser(userId: string, query: OrderQueryDto): Promise<OrderListResult> {
    const where = { userId };
    if (query.status) (where as any).status = query.status;
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: rows.map(mapOrder), total, page: query.page, limit: query.limit };
  }

  /** Admin/staff list (all orders, optional status filter). */
  async findAll(query: OrderQueryDto): Promise<OrderListResult> {
    const where = query.status ? { status: query.status } : {};
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_SELECT,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items: rows.map(mapOrder), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<OrderDto | null> {
    const row = await this.prisma.order.findUnique({ where: { id }, select: ORDER_SELECT });
    return row ? mapOrder(row) : null;
  }

  /** Resolve by human-readable order number OR internal UUID. */
  async findByRef(ref: string): Promise<OrderDto | null> {
    const row = await this.prisma.order.findFirst({
      where: { OR: [{ orderNumber: ref }, { id: ref }] },
      select: ORDER_SELECT,
    });
    return row ? mapOrder(row) : null;
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderDto | null> {
    const row = await this.prisma.order.findUnique({ where: { orderNumber }, select: ORDER_SELECT });
    return row ? mapOrder(row) : null;
  }

  /** Update order status (staff/admin state machine). */
  async updateStatus(id: string, status: string): Promise<OrderDto | null> {
    const row = await this.prisma.order.update({
      where: { id },
      data: { status: status as any },
      select: ORDER_SELECT,
    });
    return row ? mapOrder(row) : null;
  }
}
