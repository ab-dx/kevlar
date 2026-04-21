import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1/analytics')
@UseGuards(ClerkAuthGuard, RolesGuard)
@Roles('org:admin')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@Req() req: any, @Query('period') period: string = '30d') {
    return this.analyticsService.getOverview(req.user.tenantId, period);
  }

  @Get('trends')
  async getTrends(@Req() req: any, @Query('period') period: string = '30d') {
    return this.analyticsService.getTrends(req.user.tenantId, period);
  }

  @Get('employees')
  async getEmployees(@Req() req: any, @Query('period') period: string = '30d') {
    return this.analyticsService.getEmployees(req.user.tenantId, period);
  }

  @Get('top-creators')
  async getTopCreators(
    @Req() req: any,
    @Query('period') period: string = '30d',
    @Query('limit') limit: number = 10,
  ) {
    return this.analyticsService.getTopCreators(req.user.tenantId, period, limit);
  }

  @Get('top-approvers')
  async getTopApprovers(
    @Req() req: any,
    @Query('period') period: string = '30d',
    @Query('limit') limit: number = 10,
  ) {
    return this.analyticsService.getTopApprovers(req.user.tenantId, period, limit);
  }
}