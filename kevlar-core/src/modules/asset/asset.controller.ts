import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AssetService } from './asset.service';

@Controller('api/v1/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('upload/init')
  async initUpload(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { filename: string; mimeType: string }
  ) {
    return this.assetService.initUpload(tenantId, body.filename, body.mimeType);
  }

  @Post('upload/complete')
  async completeUpload(
    @Headers('x-tenant-id') tenantId: string,
    @Body() body: { originalFilename: string; minioObjectKey: string; mimeType: string; sizeBytes: number; assetType: string }
  ) {
    return this.assetService.completeUpload(tenantId, body);
  }
}
