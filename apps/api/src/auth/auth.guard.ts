import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { verifyJwt } from "./crypto";
import { parseCookies, ACCESS_COOKIE } from "./cookies";
import { AccessTokenPayload } from "./auth.types";
import { CorrelationService } from "../common/correlation.service";

/**
 * Protects routes that require a valid access token. Accepts the token from
 * either the `Authorization: Bearer` header (API clients) or the `pv_access`
 * HttpOnly cookie (browser). Attaches `req.user = { id, sessionId }` and seeds
 * the correlation context's user_id so all logs for this request carry it.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly correlation: CorrelationService) {}

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

    const payload = verifyJwt<AccessTokenPayload>(token, process.env.POKE_VAULT_JWT_SECRET || "");
    if (!payload || payload.type !== "access") {
      throw new UnauthorizedException("Invalid access token");
    }
    req.user = { id: payload.sub, sessionId: payload.sessionId };
    this.correlation.setUserId(payload.sub); // §66: user_id on every log line
    return true;
  }
}
