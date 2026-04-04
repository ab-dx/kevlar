import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AssetService } from './asset.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1/assets')
@UseGuards(ClerkAuthGuard, RolesGuard) 
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post('upload/init')
  @Roles('org:admin', 'org:creator') 
  async initUpload(
    @Req() req: any, 
    @Body() body: { filename: string; mimeType: string }
  ) {
    return this.assetService.initUpload(req.user.tenantId, body.filename, body.mimeType);
  }

  @Post('upload/complete')
  @Roles('org:admin', 'org:creator')
  async completeUpload(
    @Req() req: any,
    @Body() body: { originalFilename: string; minioObjectKey: string; mimeType: string; sizeBytes: number; assetType: string }
  ) {
    return this.assetService.completeUpload(req.user.tenantId, req.user.id, body);
  }
}
