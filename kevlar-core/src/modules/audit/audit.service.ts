import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditAction } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>) {}

  async logEvent(
    tenantId: string,
    assetId: Types.ObjectId | string,
    actorId: string,
    action: AuditAction,
    details?: Record<string, any>
  ) {
    const newLog = new this.auditLogModel({
      tenantId,
      assetId: new Types.ObjectId(assetId),
      actorId,
      action,
      details: details || {},
    });

    await newLog.save();
    console.log(`[Audit] Recorded ${action} for Asset ${assetId}`);
  }

  async getTimelineForAsset(assetId: string) {
    return this.auditLogModel
      .find({ assetId: new Types.ObjectId(assetId) })
      .sort({ createdAt: -1 }) 
      .exec();
  }
}
