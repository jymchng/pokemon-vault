import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { verifyJwt } from "./crypto";
import { parseCookies, ACCESS_COOKIE } from "./cookies";
import { AccessTokenPayload } from "./auth.types";

/**
 * Optional authentication: attaches req.user = { id, sessionId } when a valid
 * access token is present (Bearer header or pv_access cookie), but NEVER
 * rejects the request. Used by endpoints that work for both guests and
 * authenticated users (e.g. the cart).
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: { id: string; sessionId: string };
    }>();
    const authHeader = req.headers.authorization;
    const bearer =
      typeof authHeader === "string" && authHeader.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : undefined;
    const cookies = parseCookies(
      typeof req.headers.cookie === "string" ? req.headers.cookie : undefined,
    );
    const token = bearer || cookies[ACCESS_COOKIE];
    if (!token) return true; // guest — no user attached

    const payload = verifyJwt<AccessTokenPayload>(token, process.env.JWT_SECRET || "");
    if (payload && payload.type === "access") {
      req.user = { id: payload.sub, sessionId: payload.sessionId };
    }
    return true;
  }
}
