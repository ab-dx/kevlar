import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetStatus } from './schemas/asset.schema';
import { tenantContext } from '../../core/context/tenant.context';
import { AssetGateway } from '../events/asset.gateway';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';

@Processor('asset-processing')
export class AssetProcessor extends WorkerHost {
  constructor(@InjectModel(Asset.name) private assetModel: Model<Asset>,
             private assetGateway: AssetGateway,
             private auditService: AuditService,) {
    super();
  }

  async process(job: Job<{ assetId: string; tenantId: string }>): Promise<any> {
    const { assetId, tenantId } = job.data;
    
    console.log(`[Worker] Started processing asset ${assetId} for tenant ${tenantId}...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const updatedAsset = await tenantContext.run({ tenantId }, async () => {
      return this.assetModel.findByIdAndUpdate(
        assetId, 
        { status: AssetStatus.IN_REVIEW, $push: { tags: 'ws-synced' } },
        { new: true }
      );
    });

    if (!updatedAsset) {
      console.error(`[Worker] Failed to notify: Asset ${assetId} not found in DB.`);
      return { success: false, error: 'Asset not found' };
    }

    await this.auditService.logEvent(
      tenantId,
      updatedAsset._id,
      'system-worker-01', // note this was an automated system action
      AuditAction.STATE_CHANGED,
      { previousState: 'Draft', newState: updatedAsset.status, addedTags: ['ws-synced'] }
    );

    console.log(`[Worker] Finished processing asset ${assetId}. Status updated to IN_REVIEW.`);

    this.assetGateway.sendProcessingUpdate(tenantId, {
      assetId: updatedAsset._id,
      status: updatedAsset.status,
      filename: updatedAsset.originalFilename
    });
    
    return { success: true };
  }
}
