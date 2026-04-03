import { Controller, Get, Param, Headers } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('api/v1/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('assets/:assetId')
  async getAssetTimeline(
    @Headers('x-tenant-id') tenantId: string, // use for auth later
    @Param('assetId') assetId: string
  ) {
    return this.auditService.getTimelineForAsset(assetId);
  }
}
