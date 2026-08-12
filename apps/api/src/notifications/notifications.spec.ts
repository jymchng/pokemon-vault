import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { NotificationsRepository } from "./notifications.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };

class FakeNotificationsRepository {
  notifications: any[] = [];
  prefs = new Map<string, any>();
  seq = 0;

  async findForUser(userId: string, opts: any) {
    let items = this.notifications.filter((n) => n.userId === userId);
    if (opts.unreadOnly) items = items.filter((n) => !n.readAt);
    if (opts.type) items = items.filter((n) => n.type === opts.type);
    const unread = this.notifications.filter((n) => n.userId === userId && !n.readAt).length;
    return { items: items.slice(0, opts.limit), total: items.length, unread };
  }
  async markRead(userId: string, id: string) {
    const n = this.notifications.find((x) => x.id === id && x.userId === userId);
    if (!n || n.readAt) return false;
    n.readAt = new Date();
    return true;
  }
  async markAllRead(userId: string) {
    const targets = this.notifications.filter((n) => n.userId === userId && !n.readAt);
    for (const n of targets) n.readAt = new Date();
    return targets.length;
  }
  async create(data: any) {
    const row = { id: `n${++this.seq}`, userId: data.userId, type: data.type, title: data.title, body: data.body ?? null, readAt: null, metadata: data.metadata ?? null, createdAt: new Date() };
    this.notifications.push(row);
    return { ...row };
  }
  async getPreferences(userId: string) {
    return this.prefs.get(userId) ?? { userId, orderUpdates: true, shippingUpdates: true, rewardAvailable: true, collectionMilestones: true, promotions: true, systemMessages: true, emailOptIn: false };
  }
  async updatePreferences(userId: string, data: any) {
    const cur = await this.getPreferences(userId);
    const next = { ...cur, ...data };
    this.prefs.set(userId, next);
    return next;
  }
}

async function makeModule(repo: FakeNotificationsRepository) {
  return Test.createTestingModule({
    controllers: [NotificationsController],
    providers: [NotificationsService, { provide: NotificationsRepository, useValue: repo }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
}

const req = () => ({ user: { id: "u1", sessionId: "s" } });

describe("G22 notifications module", () => {
  it("lists notifications with unread count + paging meta", async () => {
    const repo = new FakeNotificationsRepository();
    await repo.create({ userId: "u1", type: "ORDER_UPDATE", title: "Order shipped" });
    await repo.create({ userId: "u1", type: "SYSTEM", title: "Welcome" });
    const mod = await makeModule(repo);
    const res = await mod.get(NotificationsController).index(req() as any, {});
    expect(res.meta.total).toBe(2);
    expect(res.meta.unread).toBe(2);
    expect(res.data).toHaveLength(2);
  });

  it("filters unreadOnly + type", async () => {
    const repo = new FakeNotificationsRepository();
    await repo.create({ userId: "u1", type: "ORDER_UPDATE", title: "A" });
    await repo.create({ userId: "u1", type: "PROMOTION", title: "B" });
    await repo.markRead("u1", "n1");
    const mod = await makeModule(repo);
    const unread = await mod.get(NotificationsController).index(req() as any, { unreadOnly: true });
    expect(unread.data).toHaveLength(1);
    const promos = await mod.get(NotificationsController).index(req() as any, { type: "PROMOTION" });
    expect(promos.data).toHaveLength(1);
  });

  it("marks one read + read-all", async () => {
    const repo = new FakeNotificationsRepository();
    await repo.create({ userId: "u1", type: "SYSTEM", title: "1" });
    await repo.create({ userId: "u1", type: "SYSTEM", title: "2" });
    const mod = await makeModule(repo);
    const ctrl = mod.get(NotificationsController);
    await ctrl.read(req() as any, "n1");
    expect(repo.notifications[0].readAt).toBeTruthy();
    const res = await ctrl.readAll(req() as any);
    expect(res.data.marked).toBe(1); // only the remaining unread
    expect(repo.notifications.every((n) => n.readAt)).toBe(true);
  });

  it("404 for marking another user's notification", async () => {
    const repo = new FakeNotificationsRepository();
    await repo.create({ userId: "u2", type: "SYSTEM", title: "other" });
    const mod = await makeModule(repo);
    await expect(mod.get(NotificationsController).read(req() as any, "n1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("preferences get + update (opt-in/out per type)", async () => {
    const repo = new FakeNotificationsRepository();
    const mod = await makeModule(repo);
    const ctrl = mod.get(NotificationsController);
    const before = await ctrl.getPreferences(req() as any);
    expect(before.data.promotions).toBe(true);
    const updated = await ctrl.updatePreferences(req() as any, { promotions: false, emailOptIn: true } as any);
    expect(updated.data.promotions).toBe(false);
    expect(updated.data.emailOptIn).toBe(true);
  });

  it("staff creates a notification", async () => {
    const repo = new FakeNotificationsRepository();
    const mod = await makeModule(repo);
    const res = await mod.get(NotificationsController).create({ userId: "u1", type: "REWARD_AVAILABLE", title: "New reward!" } as any);
    expect(res.data.type).toBe("REWARD_AVAILABLE");
  });
});
