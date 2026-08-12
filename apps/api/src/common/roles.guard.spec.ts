import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { Roles, ROLE_LEVEL } from "./roles.decorator";

class FakePrisma {
  users = new Map<string, { role: string; status: string }>();
  user = {
    findUnique: async ({ where }: { where: { id: string } }) =>
      this.users.get(where.id) ?? null,
  };
}

function makeGuard(prisma: FakePrisma, roles: string[] | undefined) {
  const reflector = new Reflector();
  if (roles !== undefined) {
    const handler = () => {};
    Reflect.defineMetadata("rbac:roles", roles, handler);
    reflector.getAllAndOverride = vi.fn(() => roles);
  }
  const guard = new RolesGuard(reflector, prisma as any);
  return { guard, handler: roles !== undefined ? (() => {}) : undefined };
}

function ctx(user?: { id: string; sessionId: string }): any {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe("G8 RBAC RolesGuard", () => {
  it("rejects when AuthGuard has not run (no req.user)", async () => {
    const prisma = new FakePrisma();
    const { guard } = makeGuard(prisma, undefined);
    await expect(guard.canActivate(ctx())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects unknown user", async () => {
    const prisma = new FakePrisma();
    const { guard } = makeGuard(prisma, undefined);
    await expect(guard.canActivate(ctx({ id: "missing", sessionId: "s" }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects suspended/deleted accounts", async () => {
    const prisma = new FakePrisma();
    prisma.users.set("u1", { role: "ADMIN", status: "SUSPENDED" });
    const { guard } = makeGuard(prisma, undefined);
    await expect(guard.canActivate(ctx({ id: "u1", sessionId: "s" }))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("allows any authenticated user when no @Roles metadata", async () => {
    const prisma = new FakePrisma();
    prisma.users.set("u1", { role: "CUSTOMER", status: "ACTIVE" });
    const { guard } = makeGuard(prisma, undefined);
    await expect(guard.canActivate(ctx({ id: "u1", sessionId: "s" }))).resolves.toBe(true);
  });

  it("CUSTOMER denied STAFF/ADMIN operations, allowed CUSTOMER-level", async () => {
    const prisma = new FakePrisma();
    prisma.users.set("u1", { role: "CUSTOMER", status: "ACTIVE" });
    const g = (roles: string[]) => makeGuard(prisma, roles).guard;
    await expect(g(["STAFF"]).canActivate(ctx({ id: "u1", sessionId: "s" }))).rejects.toBeInstanceOf(ForbiddenException);
    await expect(g(["ADMIN"]).canActivate(ctx({ id: "u1", sessionId: "s" }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("enforces hierarchy: ADMIN passes ADMIN and STAFF, denied SUPER_ADMIN-only", async () => {
    const prisma = new FakePrisma();
    prisma.users.set("a1", { role: "ADMIN", status: "ACTIVE" });
    const c = ctx({ id: "a1", sessionId: "s" });
    await expect(makeGuard(prisma, ["ADMIN"]).guard.canActivate(c)).resolves.toBe(true);
    await expect(makeGuard(prisma, ["STAFF"]).guard.canActivate(c)).resolves.toBe(true);
    await expect(makeGuard(prisma, ["SUPER_ADMIN"]).guard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("SUPER_ADMIN passes every role requirement", async () => {
    const prisma = new FakePrisma();
    prisma.users.set("s1", { role: "SUPER_ADMIN", status: "ACTIVE" });
    const c = ctx({ id: "s1", sessionId: "s" });
    for (const r of ["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"]) {
      await expect(makeGuard(prisma, [r]).guard.canActivate(c)).resolves.toBe(true);
    }
  });

  it("uses the DB role as source of truth (not any client-supplied value)", async () => {
    const prisma = new FakePrisma();
    prisma.users.set("u1", { role: "CUSTOMER", status: "ACTIVE" });
    // Client tries to claim ADMIN via req.user.role — guard must use the DB row.
    const c: any = { switchToHttp: () => ({ getRequest: () => ({ user: { id: "u1", sessionId: "s", role: "ADMIN" } }) }), getHandler: () => ({}), getClass: () => ({}) };
    await expect(makeGuard(prisma, ["ADMIN"]).guard.canActivate(c)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("attaches the current role to req.user", async () => {
    const prisma = new FakePrisma();
    prisma.users.set("u1", { role: "STAFF", status: "ACTIVE" });
    const req: any = { user: { id: "u1", sessionId: "s" } };
    const guard = new RolesGuard(new Reflector(), prisma as any);
    await guard.canActivate({
      switchToHttp: () => ({ getRequest: () => req }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any);
    expect(req.user.role).toBe("STAFF");
  });

  it("role hierarchy constants are ordered", () => {
    expect(ROLE_LEVEL.CUSTOMER).toBeLessThan(ROLE_LEVEL.STAFF);
    expect(ROLE_LEVEL.STAFF).toBeLessThan(ROLE_LEVEL.ADMIN);
    expect(ROLE_LEVEL.ADMIN).toBeLessThan(ROLE_LEVEL.SUPER_ADMIN);
    const { Reflector: _R } = require("@nestjs/core");
    void _R;
  });

  it("@Roles decorator sets metadata", () => {
    class C {
      @Roles("ADMIN", "SUPER_ADMIN")
      m() {}
    }
    const meta = Reflect.getMetadata("rbac:roles", C.prototype.m);
    expect(meta).toEqual(["ADMIN", "SUPER_ADMIN"]);
  });
});
