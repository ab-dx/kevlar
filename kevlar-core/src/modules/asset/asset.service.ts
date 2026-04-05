import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AssetFamily } from './schemas/asset-family.schema';
import { AssetVersion } from './schemas/asset-version.schema';
import { MinioService } from '../../core/storage/minio.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';

@Injectable()
export class AssetService {
  constructor(
    @InjectModel(AssetFamily.name) private familyModel: Model<AssetFamily>,
    @InjectModel(AssetVersion.name) private versionModel: Model<AssetVersion>,
    private minioService: MinioService,
    @InjectQueue('asset-processing') private assetQueue: Queue,
    private auditService: AuditService
  ) {}

  async initUpload(tenantId: string, filename: string, mimeType: string) {
    if (!filename || !mimeType) throw new BadRequestException('Filename and mimeType are required');
    return this.minioService.generateUploadUrl(tenantId, filename, mimeType);
  }

  async completeUpload(
    tenantId: string,
    userId: string,
    dto: { 
      familyId?: string; // Optional: If provided, this is a v2+ upload
      originalFilename: string; 
      minioObjectKey: string; 
      mimeType: string; 
      sizeBytes: number; 
    }
  ) {
    let familyId = dto.familyId;
    let nextVersionNumber = 1;
    let familyDocument: any;

    // --- SCENARIO A: Uploading a new version to an existing project ---
    if (familyId) {
      familyDocument = await this.familyModel.findOne({ _id: familyId, tenantId });
      if (!familyDocument) throw new NotFoundException('Asset Family not found');

      // Find the highest existing version number to increment it
      const latestVersion = await this.versionModel
        .findOne({ familyId })
        .sort({ versionNumber: -1 }) // Sort descending
        .exec();
        
      nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;
    } 
    // --- SCENARIO B: Brand new upload (Create the Family) ---
    else {
      const newFamily = new this.familyModel({
        tenantId,
        title: dto.originalFilename, // Default title to filename
        createdBy: userId,
      });
      familyDocument = await newFamily.save();
      familyId = familyDocument._id as string;
    }

    // --- CREATE THE IMMUTABLE VERSION ---
    const newVersion = new this.versionModel({
      familyId,
      tenantId,
      versionNumber: nextVersionNumber,
      minioObjectKey: dto.minioObjectKey,
      originalFilename: dto.originalFilename,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      uploadedBy: userId,
      metadata: {}, // Format-specific data will go here later
    });

    const savedVersion = await newVersion.save();

    // If this is the very first version, automatically set it as the active one
    if (nextVersionNumber === 1) {
      familyDocument.activeVersionId = savedVersion._id;
      await familyDocument.save();
    }

    // --- AUDIT & ASYNC PROCESSING ---
    await this.auditService.logEvent(
      tenantId,
      familyId,
      userId,
      nextVersionNumber === 1 ? AuditAction.ASSET_CREATED : AuditAction.ASSET_UPDATED,
      { versionNumber: nextVersionNumber, size: dto.sizeBytes }
    );
    
    await this.assetQueue.add('process.media', { 
      familyId,
      versionId: savedVersion._id, 
      tenantId 
    });

    return {
      family: familyDocument,
      version: savedVersion
    };
  }

  async findAll(tenantId: string, query: { q?: string; status?: string; page?: number; limit?: number }) {
    const page = query.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query.limit ? Math.min(50, Math.max(1, Number(query.limit))) : 20;
    const skip = (page - 1) * limit;

    const filter: any = { tenantId };
    
    if (query.status) {
      filter.status = query.status;
    }
    
    if (query.q) {
      filter.title = { $regex: query.q, $options: 'i' };
    }

    const [families, total] = await Promise.all([
      this.familyModel
        .find(filter)
        .sort({ updatedAt: -1 }) 
        .skip(skip)
        .limit(limit)
        .populate('activeVersionId') 
        .lean()
        .exec(),
      this.familyModel.countDocuments(filter),
    ]);

    return {
      data: families,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOneFamily(tenantId: string, familyId: string) {
    const family = await this.familyModel
      .findOne({ _id: familyId, tenantId })
      .lean()
      .exec();

    if (!family) {
      throw new NotFoundException(`Asset Family ${familyId} not found.`);
    }

    const versions = await this.versionModel
      .find({ familyId: family._id.toString(), tenantId })
      .sort({ versionNumber: -1 })
      .lean()
      .exec();

    return {
      ...family,
      versions, 
    };
  }

}
