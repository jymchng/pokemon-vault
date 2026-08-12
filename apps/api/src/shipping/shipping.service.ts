import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateAddressDto, UpdateAddressDto } from "./shipping.dto";
import { ShippingRepository } from "./shipping.repository";

/** Valid forward shipment transitions (§29 state machine). */
const TRANSITIONS: Record<string, string[]> = {
  PENDING: ["LABEL_CREATED", "EXCEPTION"],
  LABEL_CREATED: ["IN_TRANSIT", "EXCEPTION"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY", "EXCEPTION"],
  OUT_FOR_DELIVERY: ["DELIVERED", "EXCEPTION"],
  DELIVERED: [],
  EXCEPTION: ["LABEL_CREATED", "IN_TRANSIT", "OUT_FOR_DELIVERY"],
};

@Injectable()
export class ShippingService {
  constructor(private readonly repo: ShippingRepository) {}

  // ---- Addresses ----

  async listAddresses(userId: string) {
    return this.repo.findAddresses(userId);
  }

  async createAddress(userId: string, input: CreateAddressDto) {
    return this.repo.createAddress(userId, input);
  }

  async updateAddress(userId: string, id: string, input: UpdateAddressDto) {
    const updated = await this.repo.updateAddress(userId, id, input);
    if (!updated) throw new NotFoundException("Address not found");
    return updated;
  }

  async deleteAddress(userId: string, id: string) {
    const ok = await this.repo.deleteAddress(userId, id);
    if (!ok) throw new NotFoundException("Address not found");
  }

  // ---- Shipments ----

  /** Owner-scoped: user sees shipments tied to their order items. */
  async listMyShipments(userId: string) {
    return this.repo.findShipmentsByUser(userId);
  }

  async getShipment(id: string) {
    const shipment = await this.repo.findShipment(id);
    if (!shipment) throw new NotFoundException("Shipment not found");
    return shipment;
  }

  async createShipmentForOrder(orderId: string, input: any) {
    return this.repo.createShipment({ orderId, ...input });
  }

  /** Staff+ state-machine transition with automatic shipped/delivered timestamps. */
  async updateShipmentStatus(id: string, status: string, extra: any = {}) {
    const shipment = await this.repo.findShipment(id);
    if (!shipment) throw new NotFoundException("Shipment not found");
    const allowed = TRANSITIONS[shipment.status] ?? [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Cannot transition ${shipment.status} -> ${status}`);
    }
    const data: any = { ...extra, status };
    if (status === "LABEL_CREATED" && !shipment.shippedAt) {
      data.shippedAt = new Date();
    }
    if (status === "DELIVERED") {
      data.deliveredAt = new Date();
    }
    const updated = await this.repo.updateShipment(id, data);
    if (!updated) throw new NotFoundException("Shipment not found");
    return updated;
  }

  async getShipmentItems(shipmentId: string) {
    return this.repo.findShipmentItems(shipmentId);
  }
}
