import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditAction } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
  ) {}

  async logEvent(
    tenantId: string,
    assetFamilyId: string,
    actorId: string,
    action: AuditAction,
    metadata: Record<string, any> = {},
  ) {
    const log = new this.auditLogModel({
      tenantId,
      assetFamilyId,
      actorId,
      action,
      metadata,
    });
    return log.save();
  }

  async getTimelineForAsset(tenantId: string, familyId: string) {
    return this.auditLogModel
      .find({ 
        tenantId, 
        assetFamilyId: familyId 
      })
      .sort({ createdAt: -1 }) 
      .exec();
  }
}
