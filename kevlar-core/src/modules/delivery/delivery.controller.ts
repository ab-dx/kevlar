import { Controller, Post, Get, Patch, Param, Body, UseGuards, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { DeliveryService } from './delivery.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post('share')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('org:admin', 'org:creator')
  async createShareLink(
    @Req() req: any,
    @Body() body: { familyId: string; expiresInHours?: number }
  ) {
    return this.deliveryService.generateSecureLink(
      req.user.tenantId,
      body.familyId,
      req.user.id,
      body.expiresInHours
    );
  }

  @Public()
  @Get('resolve/:token')
  async resolveShareLink(@Param('token') token: string, @Res() res: Response) {
    const actualDownloadUrl = await this.deliveryService.resolveLink(token);
    
    res.redirect(302, actualDownloadUrl);
  }

  @Get()
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('org:admin', 'org:manager', 'org:creator')
  async getActiveDeliveries(@Req() req: any) {
    const deliveries = await this.deliveryService.findAllActive(req.user.tenantId);
    return { data: deliveries };
  }

  @Patch(':id/revoke')
  @UseGuards(ClerkAuthGuard, RolesGuard)
  @Roles('org:admin', 'org:creator')
  async revokeDelivery(@Req() req: any, @Param('id') id: string) {
    return this.deliveryService.revoke(req.user.tenantId, id);
  }
}
