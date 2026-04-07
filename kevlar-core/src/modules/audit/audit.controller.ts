import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1/audit')
@UseGuards(ClerkAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('assets/:familyId')
  @Roles('org:admin', 'org:manager') 
  async getAssetTimeline(
    @Req() req: any,
    @Param('familyId') familyId: string
  ) {
    return this.auditService.getTimelineForAsset(req.user.tenantId, familyId);
  }

  @Get()
  @Roles('org:admin', 'org:manager') 
  async getAllLogs(@Req() req: any) {
    const logs = await this.auditService.getTenantLogs(req.user.tenantId);
    return { data: logs }; 
  }
}
