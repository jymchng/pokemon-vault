import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../prisma/prisma.service";
import { ROLES_KEY, ROLE_LEVEL, UserRole } from "./roles.decorator";

export interface AuthenticatedUser {
  id: string;
  sessionId: string;
  role: UserRole;
}

/**
 * RBAC guard (G8 §11). MUST run after AuthGuard (which sets req.user.id).
 *
 * - Reads the required roles from @Roles(...) metadata.
 * - No metadata -> any authenticated user passes (authentication only).
 * - Always loads the user's CURRENT role from the database on every request —
 *   the server-side source of truth. Role changes / suspensions take effect
 *   immediately; the JWT is never trusted for authorization.
 * - Enforces the role hierarchy: SUPER_ADMIN >= ADMIN >= STAFF >= CUSTOMER.
 * - Non-ACTIVE accounts (suspended/deleted) are rejected.
 * - Attaches req.user = { id, sessionId, role } for handler-level checks.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const req = context.switchToHttp().getRequest<{
      user?: { id: string; sessionId: string };
    }>();
    if (!req.user?.id) {
      // AuthGuard must run first.
      throw new UnauthorizedException("Not authenticated");
    }

    // Server-side source of truth: current role + status from the database.
    const record = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, status: true },
    });
    if (!record || record.status !== "ACTIVE") {
      throw new UnauthorizedException("Account is not active");
    }

    const role = record.role as UserRole;
    (req.user as AuthenticatedUser).role = role;

    if (!required || required.length === 0) return true;

    // Hierarchy: allow when the user's level >= the highest required level.
    const requiredLevel = Math.max(...required.map((r) => ROLE_LEVEL[r]));
    if (ROLE_LEVEL[role] >= requiredLevel) return true;

    throw new ForbiddenException(
      `Requires role: ${required.join(" or ")}`,
    );
  }
}
