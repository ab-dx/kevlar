import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseModule } from "./core/database/database.module";
import { StorageModule } from "./core/storage/storage.module";
import { QueueModule } from "./core/queue/queue.module";
import { IamModule } from "./modules/iam/iam.module";
import { AssetModule } from "./modules/asset/asset.module";
import { DeliveryModule } from "./modules/delivery/delivery.module";
import { tenantAwarePlugin } from "./core/database/tenant.plugin";
import { TenantInterceptor } from "./common/interceptors/tenant.interceptor";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { EventsModule } from "./modules/events/events.module";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				uri: configService.get<string>("MONGO_URI"),
				connectionFactory: (connection) => {
					connection.plugin(tenantAwarePlugin);
					return connection;
				},
			}),
			inject: [ConfigService],
		}),
		BullModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				connection: {
					host: configService.get<string>("REDIS_HOST"),
					port: parseInt(configService.get<string>("REDIS_PORT") || "6379", 10),
				},
			}),
			inject: [ConfigService],
		}),
		EventsModule,
		DatabaseModule,
		StorageModule,
		QueueModule,
		IamModule,
		AssetModule,
		DeliveryModule,
	],
	controllers: [AppController],
	providers: [
		AppService,
		{
			provide: APP_INTERCEPTOR,
			useClass: TenantInterceptor,
		},
	],
})
export class AppModule {}
