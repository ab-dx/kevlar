import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetFamily } from './schemas/asset-family.schema';
import { AssetVersion } from './schemas/asset-version.schema';
import { AssetGateway } from './asset.gateway';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';

@Processor('asset-processing')
export class AssetProcessor extends WorkerHost {
  constructor(
    @InjectModel(AssetFamily.name) private familyModel: Model<AssetFamily>,
    @InjectModel(AssetVersion.name) private versionModel: Model<AssetVersion>,
    private assetGateway: AssetGateway,
    private auditService: AuditService
  ) {
    super();
  }

  async process(job: Job<{ familyId: string; versionId: string; tenantId: string }>) {
    const { familyId, versionId, tenantId } = job.data;
    
    console.log(`[Processor] Starting analysis for Version ${versionId} of Family ${familyId}...`);

    const version = await this.versionModel.findOne({ _id: versionId, tenantId });
    if (!version) {
      console.error(`[Processor] Version ${versionId} not found.`);
      return;
    }

    if (version.mimeType.startsWith('video/')) {
      version.metadata = {
        resolution: '1920x1080',
        fps: 24,
        codec: 'h264',
        durationSeconds: 120,
        mockProcessed: true
      };
    } else if (version.mimeType.startsWith('image/')) {
      version.metadata = {
        width: 4000,
        height: 3000,
        colorSpace: 'sRGB',
        mockProcessed: true
      };
    }

    await version.save();

    await this.auditService.logEvent(
      tenantId,
      familyId,
      'system-worker',
      AuditAction.ASSET_UPDATED,
      { note: 'Background metadata extraction complete', versionId }
    );

    this.assetGateway.server.to(tenantId).emit('assetProcessed', {
      familyId,
      versionId,
      message: 'Processing complete',
    });

    console.log(`[Processor] Finished processing Version ${versionId}. WebSocket fired.`);
  }
}
