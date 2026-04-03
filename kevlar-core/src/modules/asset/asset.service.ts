import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Asset, AssetStatus } from './schemas/asset.schema';
import { MinioService } from '../../core/storage/minio.service';

@Injectable()
export class AssetService {
  constructor(
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    private minioService: MinioService,
    @InjectQueue('asset-processing') private assetQueue: Queue,
  ) {}

  async initUpload(tenantId: string, filename: string, mimeType: string) {
    if (!filename || !mimeType) throw new BadRequestException('Filename and mimeType are required');
    
    return this.minioService.generateUploadUrl(tenantId, filename, mimeType);
  }

  async completeUpload(
    tenantId: string, 
    dto: { originalFilename: string; minioObjectKey: string; mimeType: string; sizeBytes: number; assetType: string }
  ) {
    const newAsset = new this.assetModel({
      ...dto,
      tenantId,
      status: AssetStatus.DRAFT, 
    });

    const savedAsset = await newAsset.save();

    await this.assetQueue.add('process.media', { 
      assetId: savedAsset._id, 
      tenantId 
    });

    return savedAsset;
  }
}
