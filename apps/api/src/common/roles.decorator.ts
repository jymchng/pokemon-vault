/**
 * RBAC (G8 §11) — role metadata decorator.
 *
 * Usage:
 *   @UseGuards(AuthGuard, RolesGuard)
 *   @Roles("ADMIN")            // ADMIN or SUPER_ADMIN
 *   @Roles("SUPER_ADMIN")      // SUPER_ADMIN only
 */
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "rbac:roles";

/** UserRole values (mirror of the Prisma enum). */
export const USER_ROLES = ["CUSTOMER", "STAFF", "ADMIN", "SUPER_ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

/**
 * Role hierarchy (server-side). Higher level implies all lower levels:
 *   SUPER_ADMIN (3) > ADMIN (2) > STAFF (1) > CUSTOMER (0)
 */
export const ROLE_LEVEL: Record<UserRole, number> = {
  CUSTOMER: 0,
  STAFF: 1,
  ADMIN: 2,
  SUPER_ADMIN: 3,
};

export function Roles(...roles: UserRole[]) {
  return SetMetadata(ROLES_KEY, roles);
}

export function roleAtLeast(required: UserRole, actual: UserRole): boolean {
  return ROLE_LEVEL[actual] >= ROLE_LEVEL[required];
}
