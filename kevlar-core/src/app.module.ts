import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DatabaseModule } from "./core/database/database.module";
import { StorageModule } from "./core/storage/storage.module";
import { QueueModule } from "./core/queue/queue.module";
import { IamModule } from "./modules/iam/iam.module";
import { AssetModule } from "./modules/asset/asset.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { TenantInterceptor } from "./common/interceptors/tenant.interceptor";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { AuditModule } from "./modules/audit/audit.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		AuditModule,
		DatabaseModule,
		StorageModule,
		QueueModule,
		IamModule,
		AssetModule,
		DeliveryModule,
		AnalyticsModule,
	],
	controllers: [],
	providers: [
		{
			provide: APP_INTERCEPTOR,
			useClass: TenantInterceptor,
		},
	],
})
export class AppModule {}
