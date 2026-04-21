import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AssetFamily, AssetFamilySchema } from '../asset/schemas/asset-family.schema';
import { AssetVersion, AssetVersionSchema } from '../asset/schemas/asset-version.schema';
import { Delivery, DeliverySchema } from '../delivery/schemas/delivery.schema';
import { AuditLog, AuditLogSchema } from '../audit/schemas/audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AssetFamily.name, schema: AssetFamilySchema },
      { name: AssetVersion.name, schema: AssetVersionSchema },
      { name: Delivery.name, schema: DeliverySchema },
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}