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
import { AssetStatus } from './enums/asset-status.enum';

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
    actorId: string,
    dto: { 
      familyId?: string; 
      originalFilename: string; 
      minioObjectKey: string; 
      mimeType: string; 
      sizeBytes: number; 
      assetType?: string;
      title?: string;
      tags?: string[];
    }
  ) {
    let familyDocument: AssetFamily | null = null;
    let versionNumber: number;

    const finalTitle = dto.title?.trim() || dto.originalFilename;
    const finalTags = Array.isArray(dto.tags) ? dto.tags : [];

    if (dto.familyId) {
      familyDocument = await this.familyModel.findOne({ _id: dto.familyId, tenantId });
      if (!familyDocument) throw new NotFoundException('Asset Family not found');

      versionNumber = familyDocument.nextVersionNumber;
      
      familyDocument.status = AssetStatus.DRAFT; 
      familyDocument.nextVersionNumber += 1;    
    } else {
      versionNumber = 1;
      familyDocument = new this.familyModel({
        tenantId,
        title: finalTitle,
        tags: finalTags,
        status: AssetStatus.DRAFT,
        nextVersionNumber: 2, 
        createdBy: actorId,
      });
    }

    const newVersion = new this.versionModel({
      familyId: familyDocument._id,
      tenantId,
      versionNumber: versionNumber,
      minioObjectKey: dto.minioObjectKey,
      originalFilename: dto.originalFilename,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      assetType: dto.assetType || 'document',
      uploadedBy: actorId,
      metadata: {}, 
    });

    const savedVersion = await newVersion.save();

    familyDocument.activeVersionId = (savedVersion._id as any).toString();
    await familyDocument.save();

    await this.auditService.logEvent(
      tenantId,
      familyDocument._id.toString(),
      actorId,
      versionNumber === 1 ? AuditAction.ASSET_CREATED : AuditAction.ASSET_UPDATED,
      { versionNumber, size: dto.sizeBytes }
    );
    
    await this.assetQueue.add('process.media', { 
      familyId: familyDocument._id,
      versionId: savedVersion._id, 
      tenantId 
    });

    return {
      family: familyDocument,
      version: savedVersion
    };
  }

  async findAll(tenantId: string, query: { q?: string; status?: string; tags?: string; type?: string; page?: number; limit?: number }) {
    const page = query.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query.limit ? Math.min(50, Math.max(1, Number(query.limit))) : 20;
    const skip = (page - 1) * limit;

    const baseFilter: any = { tenantId };
    
    if (query.status) {
      baseFilter.status = query.status;
    }

    if (query.tags) {
      const tagsArray = query.tags.split(',').map(t => t.trim()).filter(Boolean);
      if (tagsArray.length > 0) {
        baseFilter.tags = { $in: tagsArray }; 
      }
    }

    if (query.type && query.type !== 'all') {
      let mimeRegex;
      
      if (query.type === 'image') mimeRegex = /^image\//i;
      else if (query.type === 'video') mimeRegex = /^video\//i;
      else mimeRegex = /^(application|text)\//i; 

      const matchingVersions = await this.versionModel
        .find({ tenantId, mimeType: mimeRegex }, 'familyId')
        .lean()
        .exec();
      
      const familyIds = matchingVersions.map(v => v.familyId);
      baseFilter._id = { $in: familyIds };
    }

    let filter = baseFilter;
    
    if (query.q) {
      const searchRegex = new RegExp(query.q, 'i');
      
      const metadataFamilies = await this.familyModel
        .find({
          tenantId,
          'customMetadata': { $exists: true, $ne: {} }
        })
        .lean()
        .exec();
      
      const matchingMetadataIds = metadataFamilies
        .filter(family => {
          const metadata = family.customMetadata as Record<string, unknown>;
          for (const value of Object.values(metadata)) {
            if (typeof value === 'string' && searchRegex.test(value)) {
              return true;
            }
          }
          return false;
        })
        .map(f => f._id.toString());

      filter = {
        $and: [
          baseFilter,
          {
            $or: [
              { title: searchRegex },
              { tags: searchRegex },
              { _id: { $in: matchingMetadataIds } }
            ]
          }
        ]
      };
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

  async deleteFamily(tenantId: string, familyId: string, actorId: string) {
    const family = await this.familyModel.findOne({ _id: familyId, tenantId });
    if (!family) {
      throw new NotFoundException(`Asset Family ${familyId} not found.`);
    }

    await this.versionModel.deleteMany({ familyId, tenantId });

    await this.familyModel.deleteOne({ _id: familyId, tenantId });

    return { success: true, message: 'Asset family and all versions deleted successfully.' };
  }

  async addVersionToFamily(
  tenantId: string, 
  familyId: string, 
  actorId: string, 
  data: { originalFilename: string; minioObjectKey: string; mimeType: string; sizeBytes: number; assetType: string }
) {
  const family = await this.familyModel.findOne({ _id: familyId, tenantId });
  if (!family) throw new NotFoundException('Asset family not found');

  const currentVersion = family.nextVersionNumber;

  const version = new this.versionModel({
    tenantId,
    familyId: family._id,
    versionNumber: currentVersion, 
    minioObjectKey: data.minioObjectKey,
    originalFilename: data.originalFilename,
    mimeType: data.mimeType,
    sizeBytes: data.sizeBytes,
    assetType: data.assetType,
    uploadedBy: actorId,
    metadata: {},
  });
  await version.save();

  family.activeVersionId = (version._id as any).toString();

  family.nextVersionNumber = currentVersion + 1;

  family.status = AssetStatus.DRAFT; 
  
  await family.save();

  return family;
}

async getStats(tenantId: string) {
    const counts = await this.familyModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const totalAssets = await this.familyModel.countDocuments({ tenantId });

    const statsMap = counts.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    return {
      totalAssets,
      inReview: statsMap[AssetStatus.IN_REVIEW] || 0,
      approved: statsMap[AssetStatus.APPROVED] || 0,
      published: statsMap[AssetStatus.PUBLISHED] || 0,
      archived: statsMap[AssetStatus.ARCHIVED] || 0,
    };
  }

  async updateMetadata(
    tenantId: string, 
    familyId: string, 
    actorId: string, 
    dto: { title?: string; tags?: string[]; customMetadata?: Record<string, any> }
  ) {
    const family = await this.familyModel.findOne({ _id: familyId, tenantId });
    if (!family) throw new NotFoundException(`Asset Family ${familyId} not found`);

    if (dto.title !== undefined) family.title = dto.title.trim();
    if (dto.tags !== undefined) family.tags = dto.tags;

    if (dto.customMetadata !== undefined) {
      family.customMetadata = dto.customMetadata;
      family.markModified('customMetadata');
    }

    await family.save();

    await this.auditService.logEvent(
      tenantId,
      familyId,
      actorId,
      AuditAction.ASSET_UPDATED, 
      { updatedFields: Object.keys(dto), newTags: dto.tags, customMetadata: dto.customMetadata }
    );

    return family;
  }

}
