import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetFamily } from '../asset/schemas/asset-family.schema';
import { AssetVersion } from '../asset/schemas/asset-version.schema';
import { Delivery } from '../delivery/schemas/delivery.schema';
import { AuditLog, AuditAction } from '../audit/schemas/audit-log.schema';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(AssetFamily.name) private familyModel: Model<AssetFamily>,
    @InjectModel(AssetVersion.name) private versionModel: Model<AssetVersion>,
    @InjectModel(Delivery.name) private deliveryModel: Model<Delivery>,
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLog>,
  ) {}

  private getDateFilter(period: string): { createdAt?: { $gte: Date } } {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return {};
    }

    return { createdAt: { $gte: startDate } };
  }

  async getOverview(tenantId: string, period: string = '30d') {
    const dateFilter = this.getDateFilter(period);
    const matchFilter = { tenantId, ...dateFilter };

    const [
      totalAssets,
      assetsByStatus,
      totalVersions,
      totalDeliveries,
      totalDownloads,
    ] = await Promise.all([
      this.familyModel.countDocuments(matchFilter),
      this.familyModel.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.versionModel.countDocuments({ ...matchFilter, tenantId }),
      this.deliveryModel.countDocuments(matchFilter),
      this.auditModel.countDocuments({
        ...matchFilter,
        tenantId,
        action: AuditAction.ASSET_DOWNLOADED,
      }),
    ]);

    const statusBreakdown = assetsByStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAssets,
      totalVersions,
      totalDeliveries,
      totalDownloads,
      statusBreakdown,
    };
  }

  async getTrends(tenantId: string, period: string = '30d') {
    const dateFilter = this.getDateFilter(period);

    const assetsTrend = await this.familyModel.aggregate([
      {
        $match: { tenantId, ...dateFilter },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const approvalsTrend = await this.auditModel.aggregate([
      {
        $match: {
          tenantId,
          ...dateFilter,
          action: AuditAction.WORKFLOW_STATE_CHANGED,
        },
      },
      { $unwind: '$details' },
      { $match: { 'details.newState': 'APPROVED' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const downloadsTrend = await this.auditModel.aggregate([
      {
        $match: {
          tenantId,
          ...dateFilter,
          action: AuditAction.ASSET_DOWNLOADED,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return {
      assets: assetsTrend.map((t) => ({ date: t._id, count: t.count })),
      approvals: approvalsTrend.map((t) => ({ date: t._id, count: t.count })),
      downloads: downloadsTrend.map((t) => ({ date: t._id, count: t.count })),
    };
  }

  async getEmployees(tenantId: string, period: string = '30d') {
    const dateFilter = this.getDateFilter(period);
    const matchFilter = { tenantId, ...dateFilter };

    const [assetsByCreator, approvalsByUser, versionsByUploader, linksByCreator] =
      await Promise.all([
        this.familyModel.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$createdBy', count: { $sum: 1 } } },
        ]),
        this.auditModel.aggregate([
          {
            $match: {
              ...matchFilter,
              action: AuditAction.WORKFLOW_STATE_CHANGED,
            },
          },
          { $unwind: '$details' },
          { $match: { 'details.newState': 'APPROVED' } },
          { $group: { _id: '$actorId', count: { $sum: 1 } } },
        ]),
        this.versionModel.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
        ]),
        this.deliveryModel.aggregate([
          { $match: matchFilter },
          { $group: { _id: '$createdBy', count: { $sum: 1 } } },
        ]),
      ]);

    const employeeMap = new Map<string, any>();

    const addToMap = (data: { _id: string; count: number }[], field: string) => {
      data.forEach((item) => {
        if (!employeeMap.has(item._id)) {
          employeeMap.set(item._id, { userId: item._id, assetsCreated: 0, assetsApproved: 0, versionsUploaded: 0, linksCreated: 0 });
        }
        employeeMap.get(item._id)[field] = item.count;
      });
    };

    addToMap(assetsByCreator, 'assetsCreated');
    addToMap(approvalsByUser, 'assetsApproved');
    addToMap(versionsByUploader, 'versionsUploaded');
    addToMap(linksByCreator, 'linksCreated');

    return Array.from(employeeMap.values()).sort(
      (a, b) => b.assetsCreated - a.assetsCreated,
    );
  }

  async getTopCreators(tenantId: string, period: string = '30d', limit: number = 10) {
    const dateFilter = this.getDateFilter(period);
    
    const topCreators = await this.familyModel.aggregate([
      { $match: { tenantId, ...dateFilter } },
      { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    return topCreators.map((t) => ({ userId: t._id, count: t.count }));
  }

  async getTopApprovers(tenantId: string, period: string = '30d', limit: number = 10) {
    const dateFilter = this.getDateFilter(period);

    const topApprovers = await this.auditModel.aggregate([
      {
        $match: {
          tenantId,
          ...dateFilter,
          action: AuditAction.WORKFLOW_STATE_CHANGED,
        },
      },
      { $unwind: '$details' },
      { $match: { 'details.newState': 'APPROVED' } },
      {
        $group: {
          _id: '$actorId',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: limit,
      },
    ]);

    return topApprovers.map((t) => ({ userId: t._id, count: t.count }));
  }
}
