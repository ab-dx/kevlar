import { Injectable, NotFoundException, UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetFamily } from '../asset/schemas/asset-family.schema';
import { AssetVersion } from '../asset/schemas/asset-version.schema';
import { MinioService } from '../../core/storage/minio.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';
import { tenantContext } from '../../core/context/tenant.context';

@Injectable()
export class DeliveryService {
  constructor(
    private jwtService: JwtService,
    @InjectModel(AssetFamily.name) private familyModel: Model<AssetFamily>,
    @InjectModel(AssetVersion.name) private versionModel: Model<AssetVersion>,
    private minioService: MinioService,
    private auditService: AuditService
  ) {}

  async generateSecureLink(tenantId: string, familyId: string, actorId: string, expiresInHours: number = 24) {
    const family = await this.familyModel.findOne({ _id: familyId, tenantId });
    if (!family) throw new NotFoundException('Asset Family not found');
    if (!family.activeVersionId) throw new BadRequestException('This asset has no active version to share');

    const payload = { sub: familyId, vid: family.activeVersionId, tid: tenantId };
    const token = this.jwtService.sign(payload, { expiresIn: `${expiresInHours}h` });

    await this.auditService.logEvent(
      tenantId,
      familyId,
      actorId,
      AuditAction.SECURE_LINK_GENERATED,
      { expiresInHours, versionShared: family.activeVersionId }
    );

    return {
      secureUrl: `http://localhost:3000/api/v1/delivery/resolve/${token}`,
      expiresInHours
    };
  }

  async resolveLink(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      const familyId = payload.sub;
      const versionId = payload.vid; 
      const tenantId = payload.tid;

      return await tenantContext.run({ tenantId, userId: 'public-viewer' }, async () => {
        
        const version = await this.versionModel.findOne({ _id: versionId, familyId, tenantId });
        
        if (!version) {
          throw new NotFoundException('The requested asset version has been deleted or moved.');
        }

        await this.auditService.logEvent(
          tenantId,
          familyId,
          'public-viewer',
          AuditAction.ASSET_DOWNLOADED,
          { method: 'secure-link', versionId }
        );

        return await this.minioService.generateDownloadUrl(version.minioObjectKey);
      });

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new ForbiddenException('This secure link has expired.');
      }
      throw new UnauthorizedException('Invalid secure link.');
    }
  }
}
