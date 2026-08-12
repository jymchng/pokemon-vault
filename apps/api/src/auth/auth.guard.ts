import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { verifyJwt } from "./crypto";
import { parseCookies, ACCESS_COOKIE } from "./cookies";
import { AccessTokenPayload } from "./auth.types";

/**
 * Protects routes that require a valid access token. Accepts the token from
 * either the `Authorization: Bearer` header (API clients) or the `pv_access`
 * HttpOnly cookie (browser). Attaches `req.user = { id, sessionId }`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
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
    if (!token) throw new UnauthorizedException("Missing access token");

    const payload = verifyJwt<AccessTokenPayload>(token, process.env.JWT_SECRET || "");
    if (!payload || payload.type !== "access") {
      throw new UnauthorizedException("Invalid access token");
    }
    req.user = { id: payload.sub, sessionId: payload.sessionId };
    return true;
  }
}
