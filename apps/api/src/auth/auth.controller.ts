import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ZodError } from "zod";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  TokenSchema,
} from "./auth.dto";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearCookie,
  parseCookies,
  setCookie,
} from "./cookies";
import { Throttle } from "@nestjs/throttler";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "./auth.service";

/**
 * Auth API.
 * - Access token: short-lived JWT (also returned in body for API clients).
 * - Refresh token: opaque, rotating, single-use, hashed at rest; delivered
 *   ONLY as an HttpOnly + Secure + SameSite=Lax cookie.
 * - CSRF: SameSite=Lax + Origin check on state-changing cookie endpoints.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly service: AuthService) {}

  private get secure(): boolean {
    return process.env.NODE_ENV === "production";
  }

  private get allowedOrigin(): string | undefined {
    return process.env.WEB_ORIGIN || undefined;
  }

  /**
   * CSRF defense for state-changing cookie endpoints (refresh/logout).
   * - No WEB_ORIGIN configured  -> check disabled.
   * - No Origin header present  -> non-browser client (curl/mobile), allowed.
   * - Origin present            -> must match WEB_ORIGIN, else reject.
   * Browsers always send Origin on cross-site requests; SameSite=Lax is the
   * first line of defense and this origin check is the second.
   */
  private assertOrigin(req: {
    headers: Record<string, string | string[] | undefined>;
  }): void {
    const origin = req.headers.origin;
    const allowed = this.allowedOrigin;
    if (!allowed || !origin) return;
    if (typeof origin === "string" && origin.startsWith(allowed)) return;
    throw new UnauthorizedException("Cross-site request rejected");
  }

  private metaOf(req: any): { device?: string; ip?: string; userAgent?: string } {
    return {
      device: req.headers["x-device"] ? String(req.headers["x-device"]) : undefined,
      ip: req.ip ? String(req.ip) : undefined,
      userAgent: req.headers["user-agent"]
        ? String(req.headers["user-agent"]).slice(0, 400)
        : undefined,
    };
  }

  private setAccessCookie(res: any, accessToken: string): void {
    setCookie(res, ACCESS_COOKIE, accessToken, {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000,
    });
  }

  private setRefreshCookie(res: any, refreshToken: string): void {
    setCookie(res, REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.secure,
      sameSite: "lax",
      path: "/",
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    });
  }

  private clearSessionCookies(res: any): void {
    clearCookie(res, ACCESS_COOKIE);
    clearCookie(res, REFRESH_COOKIE);
  }

  private cookiesOf(req: any): Record<string, string> {
    return parseCookies(
      typeof req.headers.cookie === "string" ? req.headers.cookie : undefined,
    );
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: unknown, @Req() req: any, @Res() res: any) {
    this.assertOrigin(req); // login-CSRF defense
    const parsed = RegisterSchema.parse(body);
    const result = await this.service.register(parsed, this.metaOf(req));
    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    return res.status(HttpStatus.CREATED).json({
      data: { user: result.user, accessToken: result.accessToken },
    });
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown, @Req() req: any, @Res() res: any) {
    this.assertOrigin(req); // login-CSRF defense
    const parsed = LoginSchema.parse(body);
    const result = await this.service.login(
      parsed.email,
      parsed.password,
      this.metaOf(req),
    );
    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    return res.json({
      data: { user: result.user, accessToken: result.accessToken },
    });
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any, @Res() res: any) {
    const cookies = this.cookiesOf(req);
    const refresh = cookies[REFRESH_COOKIE];
    if (refresh) {
      try {
        this.assertOrigin(req);
        await this.service.logout(refresh);
      } catch {
        // Never leak whether logout failed; always clear the browser cookies.
      }
    }
    this.clearSessionCookies(res);
    return res.json({ data: { success: true } });
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: any, @Res() res: any) {
    const cookies = this.cookiesOf(req);
    const refresh = cookies[REFRESH_COOKIE];
    if (!refresh) throw new UnauthorizedException("Missing refresh token");
    this.assertOrigin(req);
    const result = await this.service.refresh(refresh);
    this.setAccessCookie(res, result.accessToken);
    this.setRefreshCookie(res, result.refreshToken); // rotated value
    return res.json({
      data: { user: result.user, accessToken: result.accessToken },
    });
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async me(@Req() req: any) {
    const { user, session } = await this.service.me(req.user.id, req.user.sessionId);
    return { data: { user, session } };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: unknown) {
    const parsed = TokenSchema.parse(body);
    await this.service.verifyEmail(parsed.token);
    return { data: { verified: true } };
  }

  @Post("forgot-password")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(@Body() body: unknown) {
    const parsed = ForgotPasswordSchema.parse(body);
    await this.service.forgotPassword(parsed.email);
    return { data: { ok: true } };
  }

  @Post("reset-password")
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: unknown) {
    const parsed = ResetPasswordSchema.parse(body);
    await this.service.resetPassword(parsed.token, parsed.password);
    return { data: { ok: true } };
  }

  @Get("sessions")
  @UseGuards(AuthGuard)
  async sessions(@Req() req: any) {
    const sessions = await this.service.listSessions(req.user.id);
    return {
      data: sessions.map((s) => ({ ...s, current: s.id === req.user.sessionId })),
    };
  }

  @Delete("sessions/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AuthGuard)
  async revokeSession(@Req() req: any, @Param("id") id: string, @Res() res: any) {
    await this.service.revokeSession(req.user.id, id);
    if (id === req.user.sessionId) this.clearSessionCookies(res);
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Post("sessions/revoke-others")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  async revokeOthers(@Req() req: any) {
    await this.service.revokeOtherSessions(req.user.id, req.user.sessionId);
    return { data: { ok: true } };
  }
}
