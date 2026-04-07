import { Controller, Patch, Post, Param, Body, UseGuards, Get, Query, Req, Delete } from '@nestjs/common';
import { AssetService } from './asset.service';
import { ClerkAuthGuard } from '../../common/guards/clerk-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { WorkflowService } from './workflow.service'
import { AssetStatus } from './enums/asset-status.enum'

@Controller('api/v1/assets')
@UseGuards(ClerkAuthGuard, RolesGuard) 
export class AssetController {
  constructor(private readonly assetService: AssetService,
             private readonly workflowService: WorkflowService) {}

  @Get('stats/overview')
  @Roles('org:admin', 'org:manager', 'org:creator')
  async getOverviewStats(@Req() req: any) {
    return this.assetService.getStats(req.user.tenantId);
  }

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
    @Body() body: { originalFilename: string; minioObjectKey: string; mimeType: string; sizeBytes: number; assetType: string;
    title?: string; 
    tags?: string[];
    }
  ) {
    return this.assetService.completeUpload(req.user.tenantId, req.user.id, body);
  }

  @Post(':id/submit')
  @Roles('org:admin', 'org:creator') 
  async submitForReview(
    @Req() req: any,
    @Param('id') familyId: string
  ) {
    return this.workflowService.submitForReview(req.user.tenantId, familyId, req.user.id);
  }

  @Post(':id/approve')
  @Roles('org:admin', 'org:manager') 
  async approveMedia(
    @Req() req: any,
    @Param('id') familyId: string,
    @Body('notes') notes: string
  ) {
    return this.workflowService.approveAsset(req.user.tenantId, familyId, req.user.id, notes);
  }

  @Get()
  @Roles('org:admin', 'org:manager', 'org:creator')
  async getAssets(
    @Req() req: any,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('tags') tags?: string,
    @Query('type') type?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.assetService.findAll(req.user.tenantId, { q, status, tags, type, page, limit });
  }

  @Get(':id')
  @Roles('org:admin', 'org:manager', 'org:creator')
  async getAssetDetail(
    @Req() req: any,
    @Param('id') familyId: string
  ) {
    return this.assetService.findOneFamily(req.user.tenantId, familyId);
  }

  @Delete(':id')
  @Roles('org:admin', 'org:manager') 
  async deleteAssetFamily(
    @Req() req: any,
    @Param('id') familyId: string
  ) {
    return this.assetService.deleteFamily(req.user.tenantId, familyId, req.user.id);
  }

  @Post(':id/versions/complete')
  @Roles('org:admin', 'org:creator')
  async completeVersionUpload(
    @Req() req: any,
    @Param('id') familyId: string,
    @Body() body: { 
      originalFilename: string; 
      minioObjectKey: string; 
      mimeType: string; 
      sizeBytes: number; 
      assetType: string 
    }
  ) {
    return this.assetService.completeUpload(req.user.tenantId, req.user.id, {
      ...body,
      familyId, 
    });
  }

  @Patch(':id/status')
  @Roles('org:admin', 'org:manager')
  async updateStatus(
    @Req() req: any,
    @Param('id') familyId: string,
    @Body() body: { status: AssetStatus; notes?: string }
  ) {
    return this.workflowService.transitionState(
      req.user.tenantId,
      familyId,
      req.user.id,
      body.status,
      body.notes
    );
  }

  @Patch(':id/metadata')
  @Roles('org:admin', 'org:manager', 'org:creator')
  async updateMetadata(
    @Req() req: any,
    @Param('id') familyId: string,
    @Body() body: { title?: string; tags?: string[]; customMetadata?: Record<string, any> }
  ) {
    return this.assetService.updateMetadata(
      req.user.tenantId, 
      familyId, 
      req.user.id, 
      body
    );
  }
}
