import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AdminRepository } from "./admin.repository";
import { AuditService } from "../audit/audit.service";
import {
  AdminCollectionGrantDto,
  AdminInventoryAdjustDto,
  AdminRefundDto,
  AdminRoleDto,
  AdminUserStatusDto,
} from "./admin.dto";

/** Admin operations (§88) — every mutation is audited (§89). */
@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly audit: AuditService,
  ) {}

  private async auditAction(
    actorId: string | undefined,
    ip: string | undefined,
    ua: string | undefined,
    action: string,
    resourceType: string,
    resourceId: string,
    before: unknown,
    after: unknown,
  ): Promise<void> {
    await this.audit.record({
      actorId,
      action,
      resourceType,
      resourceId,
      before: before as any,
      after: after as any,
      ipAddress: ip,
      userAgent: ua,
    });
  }

  async dashboard() {
    return this.repo.dashboard();
  }

  async adjustInventory(ctx: any, input: AdminInventoryAdjustDto) {
    try {
      const r = await this.repo.adjustInventory(input);
      await this.auditAction(ctx.user?.id, ctx.ip, ctx.headers?.["user-agent"], "inventory.adjust", "InventoryItem", input.itemId, r.before, r.after);
      return r;
    } catch (err: any) {
      if (err.message === "ITEM_NOT_FOUND") throw new NotFoundException("Inventory item not found");
      throw err;
    }
  }

  async inspectOrder(orderRef: string) {
    const order = await this.repo.inspectOrder(orderRef);
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async refund(ctx: any, input: AdminRefundDto) {
    try {
      const r = await this.repo.refund(input);
      await this.auditAction(ctx.user?.id, ctx.ip, ctx.headers?.["user-agent"], "order.refund", "Order", input.orderId, r.before, r.after);
      return r;
    } catch (err: any) {
      if (err.message === "ORDER_NOT_FOUND") throw new NotFoundException("Order not found");
      throw err;
    }
  }

  async grantCollection(ctx: any, input: AdminCollectionGrantDto) {
    try {
      const r = await this.repo.grantCollection(input);
      await this.auditAction(ctx.user?.id, ctx.ip, ctx.headers?.["user-agent"], "collection.grant", "CollectionItem", `${input.userId}:${input.cardId}`, r.before, r.after);
      return r;
    } catch (err: any) {
      if (err.message === "USER_OR_CARD_NOT_FOUND") throw new BadRequestException("User or card not found");
      throw err;
    }
  }

  async setUserStatus(ctx: any, input: AdminUserStatusDto) {
    try {
      const r = await this.repo.setUserStatus(input);
      await this.auditAction(ctx.user?.id, ctx.ip, ctx.headers?.["user-agent"], "user.status", "User", input.userId, r.before, r.after);
      return r;
    } catch (err: any) {
      if (err.message === "USER_NOT_FOUND") throw new NotFoundException("User not found");
      throw err;
    }
  }

  async setUserRole(ctx: any, input: AdminRoleDto) {
    try {
      const r = await this.repo.setUserRole(input);
      await this.auditAction(ctx.user?.id, ctx.ip, ctx.headers?.["user-agent"], "admin.permission", "User", input.userId, r.before, r.after);
      return r;
    } catch (err: any) {
      if (err.message === "USER_NOT_FOUND") throw new NotFoundException("User not found");
      throw err;
    }
  }
}
