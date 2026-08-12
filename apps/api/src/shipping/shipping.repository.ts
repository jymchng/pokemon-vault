import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AddressDto, ShipmentDto, ShipmentItemDto } from "./shipping.dto";

function mapAddress(row: any): AddressDto {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postal: row.postal,
    country: row.country,
    isDefault: row.isDefault,
  };
}

function mapShipment(row: any): ShipmentDto {
  return {
    id: row.id,
    orderId: row.orderId,
    orderNumber: row.order?.orderNumber ?? "",
    carrier: row.carrier,
    trackingNumber: row.trackingNumber,
    trackingUrl: row.trackingUrl,
    status: row.status,
    estimatedDelivery: row.estimatedDelivery,
    shippedAt: row.shippedAt,
    deliveredAt: row.deliveredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class ShippingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Addresses ----

  async findAddresses(userId: string): Promise<AddressDto[]> {
    const rows = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(mapAddress);
  }

  async findAddress(userId: string, id: string): Promise<AddressDto | null> {
    const row = await this.prisma.address.findFirst({ where: { id, userId } });
    return row ? mapAddress(row) : null;
  }

  async createAddress(userId: string, data: any): Promise<AddressDto> {
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const row = await this.prisma.address.create({ data: { ...data, userId } });
    return mapAddress(row);
  }

  async updateAddress(userId: string, id: string, data: any): Promise<AddressDto | null> {
    if (data.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    const row = await this.prisma.address.updateMany({
      where: { id, userId },
      data,
    });
    if (row.count !== 1) return null;
    const updated = await this.prisma.address.findFirst({ where: { id, userId } });
    return updated ? mapAddress(updated) : null;
  }

  async deleteAddress(userId: string, id: string): Promise<boolean> {
    const res = await this.prisma.address.deleteMany({ where: { id, userId } });
    return res.count === 1;
  }

  // ---- Shipments ----

  async findShipmentsForOrder(orderId: string): Promise<ShipmentDto[]> {
    const rows = await this.prisma.shipment.findMany({
      where: { orderId },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapShipment);
  }

  async findShipment(id: string): Promise<ShipmentDto | null> {
    const row = await this.prisma.shipment.findUnique({
      where: { id },
      include: { order: { select: { orderNumber: true } } },
    });
    return row ? mapShipment(row) : null;
  }

  async findShipmentsByUser(userId: string): Promise<ShipmentDto[]> {
    const rows = await this.prisma.shipment.findMany({
      where: { items: { some: { userId } } },
      include: { order: { select: { orderNumber: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapShipment);
  }

  async createShipment(data: any): Promise<ShipmentDto> {
    const row = await this.prisma.shipment.create({
      data: {
        orderId: data.orderId,
        carrier: data.carrier ?? null,
        trackingNumber: data.trackingNumber ?? null,
        trackingUrl: data.trackingUrl ?? null,
        status: "PENDING",
        estimatedDelivery: data.estimatedDelivery ?? null,
      },
      include: { order: { select: { orderNumber: true } } },
    });
    return mapShipment(row);
  }

  async updateShipment(id: string, data: any): Promise<ShipmentDto | null> {
    const row = await this.prisma.shipment.update({
      where: { id },
      data: {
        ...(data.carrier !== undefined ? { carrier: data.carrier ?? null } : {}),
        ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber ?? null } : {}),
        ...(data.trackingUrl !== undefined ? { trackingUrl: data.trackingUrl ?? null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.estimatedDelivery !== undefined ? { estimatedDelivery: data.estimatedDelivery ?? null } : {}),
        ...(data.shippedAt !== undefined ? { shippedAt: data.shippedAt ?? null } : {}),
        ...(data.deliveredAt !== undefined ? { deliveredAt: data.deliveredAt ?? null } : {}),
      },
      include: { order: { select: { orderNumber: true } } },
    });
    return row ? mapShipment(row) : null;
  }

  async findShipmentItems(shipmentId: string): Promise<ShipmentItemDto[]> {
    const rows = await this.prisma.shipmentItem.findMany({ where: { shipmentId } });
    return rows.map((r) => ({
      id: r.id,
      shipmentId: r.shipmentId,
      orderItemId: r.orderItemId,
      userId: r.userId,
      quantity: r.quantity,
    }));
  }

  async addShipmentItem(shipmentId: string, data: {
    orderItemId?: string | null;
    userId?: string | null;
    quantity: number;
  }): Promise<ShipmentItemDto> {
    const row = await this.prisma.shipmentItem.create({
      data: { shipmentId, orderItemId: data.orderItemId ?? null, userId: data.userId ?? null, quantity: data.quantity },
    });
    return {
      id: row.id,
      shipmentId: row.shipmentId,
      orderItemId: row.orderItemId,
      userId: row.userId,
      quantity: row.quantity,
    };
  }
}
