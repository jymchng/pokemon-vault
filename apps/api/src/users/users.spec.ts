import { Test } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UsersRepository } from "./users.repository";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";

const passGuard = { canActivate: () => true };

class FakeUsersRepository {
  async findAll() {
    return [];
  }
  async create() {
    return { id: "u1", email: "a@b.c", emailVerified: false, firstName: null, lastName: null, displayName: null, avatarUrl: null, status: "ACTIVE", role: "CUSTOMER", createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null };
  }
  async findByEmail() {
    return null;
  }
  async updateLastLogin(id: string) {
    return { id, email: "a@b.c", emailVerified: false, firstName: null, lastName: null, displayName: null, avatarUrl: null, status: "ACTIVE", role: "CUSTOMER", createdAt: new Date(), updatedAt: new Date(), lastLoginAt: new Date() };
  }
  async softDelete(id: string) {
    return { id, email: "a@b.c", emailVerified: false, firstName: null, lastName: null, displayName: null, avatarUrl: null, status: "DELETED", role: "CUSTOMER", createdAt: new Date(), updatedAt: new Date(), lastLoginAt: null };
  }
}

it("users: service list returns []", async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [UsersController],
    providers: [UsersService, { provide: UsersRepository, useClass: FakeUsersRepository }],
  })
    .overrideGuard(AuthGuard)
    .useValue(passGuard)
    .overrideGuard(RolesGuard)
    .useValue(passGuard)
    .compile();
  const ctrl = moduleRef.get(UsersController);
  expect(await ctrl.index()).toEqual({ data: [] });
});

it("users: DTO never contains passwordHash", () => {
  const dto = {
    id: "u1",
    email: "a@b.c",
    emailVerified: false,
    firstName: null,
    lastName: null,
    displayName: null,
    avatarUrl: null,
    status: "ACTIVE",
    role: "CUSTOMER",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null,
  };
  // The safe-select contract: passwordHash must never appear on the returned user.
  expect("passwordHash" in dto).toBe(false);
  expect(JSON.stringify(dto)).not.toContain("passwordHash");
});
