import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  CreateLocationDto,
  DamageDto,
  InventoryItemDto,
  InventoryLocationDto,
  InventoryMovementDto,
  RestockDto,
} from "./inventory.dto";
import { InventoryRepository } from "./inventory.repository";

export const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 min
export const RESERVATION_SWEEP_MS = 60 * 1000; // sweep every 60s

@Injectable()
export class InventoryService implements OnModuleInit {
  private readonly logger = new Logger(InventoryService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly repo: InventoryRepository) {}

  onModuleInit() {
    // Periodic sweep: release expired reservations (reservation expiry).
    this.timer = setInterval(() => {
      this.releaseExpiredReservations()
        .then((n) => {
          if (n > 0) this.logger.log(`Released ${n} expired reservation(s)`);
        })
        .catch((err) => this.logger.error("Reservation sweep failed", err));
    }, RESERVATION_SWEEP_MS);
    this.timer.unref?.();
  }

  async listItems(): Promise<InventoryItemDto[]> {
    return this.repo.findAllItems();
  }

  async listMovements(itemId?: string): Promise<InventoryMovementDto[]> {
    return this.repo.findMovements(itemId);
  }

  async listLocations(): Promise<InventoryLocationDto[]> {
    return this.repo.findLocations();
  }

  async createLocation(input: CreateLocationDto): Promise<InventoryLocationDto> {
    try {
      return await this.repo.createLocation(input.name, input.code);
    } catch (err: any) {
      if (err?.code === "P2002") throw new ConflictException("Location name/code already exists");
      throw err;
    }
  }

  /** Restock: quantity += n, RESTOCK movement. Guarded by the DB check constraint. */
  async restock(itemId: string, input: RestockDto): Promise<InventoryItemDto> {
    const res = await this.repo.applyChange(itemId, input.quantity, input.reason);
    if (!res.ok) throw new NotFoundException("Inventory item not found");
    return this.toItemDto(res.item);
  }

  /** Damage: quantity -= n (only from AVAILABLE stock), DAMAGE movement. */
  async damage(itemId: string, input: DamageDto): Promise<InventoryItemDto> {
    const res = await this.repo.applyChange(itemId, -input.quantity, "DAMAGE", {
      where: { quantity: { gte: input.quantity } },
    });
    if (!res.ok) throw new BadRequestException("Insufficient stock or item not found");
    return this.toItemDto(res.item);
  }

  /**
   * Release expired reservations: for each expired, unreleased reservation,
   * decrement reserved and record a RELEASE movement (transaction-safe sweep).
   * Returns the number of reservations released.
   */
  async releaseExpiredReservations(now = new Date()): Promise<number> {
    const expired = await this.repo.findExpiredReservations(now);
    let released = 0;
    for (const r of expired) {
      const ok = await this.repo.releaseReservation(r.id, now);
      if (ok) released++;
    }
    return released;
  }

  private toItemDto(item: any): InventoryItemDto {
    return {
      id: item.id,
      productId: item.productId,
      sku: item.product?.sku ?? "",
      productName: item.product?.name ?? "",
      locationId: item.locationId,
      locationName: item.location?.name ?? null,
      status: item.status,
      quantity: item.quantity,
      reserved: item.reserved,
      available: item.quantity - item.reserved,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
