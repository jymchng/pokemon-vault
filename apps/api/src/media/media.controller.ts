import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { RequestUploadSchema } from "./media.dto";
import { MediaService } from "./media.service";

/**
 * Media (§47-48).
 *   GET  /media                  auth — list assets
 *   GET  /media/:id              auth — asset detail + signed download URL
 *   POST /media/request-upload   auth — signed PUT URL (client uploads to storage)
 *   POST /media/complete         auth — complete client upload (record + queue processing)
 *   DELETE /media/:id            auth — delete asset
 *   POST /admin/media/process    STAFF+ — trigger image processing (dev/testing)
 */
@Controller("media")
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly service: MediaService) {}

  @Get()
  async index() {
    return { data: await this.service.list() };
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const asset = await this.service.get(id);
    const url = await this.service.getDownloadUrl(asset.bucket, asset.key);
    return { data: { ...asset, downloadUrl: url } };
  }

  @Post("request-upload")
  @HttpCode(HttpStatus.OK)
  async requestUpload(@Body() body: unknown) {
    const parsed = RequestUploadSchema.parse(body);
    return { data: await this.service.requestUpload(parsed) };
  }

  @Post("complete")
  @HttpCode(HttpStatus.CREATED)
  async complete(@Query("bucket") bucket: string, @Query("key") key: string) {
    return { data: await this.service.completeUpload(bucket, key) };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.service.remove(id);
  }

  @Post("admin/process")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("STAFF")
  @HttpCode(HttpStatus.OK)
  async process(@Body() body: { assetId: string; bucket: string; key: string }) {
    return { data: await this.service.processImage(body) };
  }
}
