import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from '../asset/schemas/asset.schema';
import { MinioService } from '../../core/storage/minio.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';
import { tenantContext } from '../../core/context/tenant.context';

@Injectable()
export class DeliveryService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(Asset.name) private assetModel: Model<Asset>,
    private minioService: MinioService,
    private auditService: AuditService
  ) {}

  async generateSecureLink(tenantId: string, assetId: string, actorId: string, expiresInHours: number = 24) {
    const asset = await this.assetModel.findOne({ _id: assetId, tenantId });
    if (!asset) throw new NotFoundException('Asset not found');

    const payload = { sub: assetId, tid: tenantId };
    const token = this.jwtService.sign(payload, { expiresIn: `${expiresInHours}h` });

    await this.auditService.logEvent(
      tenantId,
      assetId,
      actorId,
      AuditAction.SECURE_LINK_GENERATED,
      { expiresInHours }
    );

    return {
      secureUrl: `http://localhost:3000/api/v1/delivery/resolve/${token}`,
      expiresInHours
    };
  }

  async resolveLink(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const assetId = payload.sub;
      const tenantId = payload.tid;

      return await tenantContext.run({ tenantId, userId: 'public-viewer' }, async () => {
        
        const asset = await this.assetModel.findOne({ _id: assetId, tenantId });
        
        if (!asset) {
          throw new NotFoundException('The requested asset has been deleted or moved.');
        }

        await this.auditService.logEvent(
          tenantId,
          assetId,
          'public-viewer',
          AuditAction.ASSET_DOWNLOADED,
          { method: 'secure-link' }
        );

        return await this.minioService.generateDownloadUrl(asset.minioObjectKey);
      });

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ForbiddenException('This secure link has expired.');
      }
      throw new UnauthorizedException('Invalid secure link.');
    }
  }
}
