import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { PrivacyService } from "./privacy.service";

/**
 * Privacy & GDPR (§103-104):
 *   GET    /privacy/export       — data portability (self)
 *   DELETE /privacy/account      — right to erasure (self, soft-delete + anonymize)
 *   GET    /privacy/consent      — marketing consent status
 *   PATCH  /privacy/consent      — marketing opt-in/out
 */
@Controller("privacy")
@UseGuards(AuthGuard)
export class PrivacyController {
  constructor(private readonly service: PrivacyService) {}

  @Get("export")
  async export(@Req() req: any) {
    return { data: await this.service.exportUser(req.user.id) };
  }

  @Delete("account")
  @HttpCode(HttpStatus.OK)
  async deleteAccount(@Req() req: any) {
    return {
      data: await this.service.deleteAccount(
        req.user.id, req.user.id, req.ip, req.headers?.["user-agent"],
      ),
    };
  }

  @Get("consent")
  async consent(@Req() req: any) {
    return { data: await this.service.getConsent(req.user.id) };
  }

  @Patch("consent")
  @HttpCode(HttpStatus.OK)
  async setConsent(@Req() req: any, @Body() body: { marketingOptIn?: boolean }) {
    const optIn = body.marketingOptIn === true;
    return { data: await this.service.setMarketingOptIn(req.user.id, optIn) };
  }
}
