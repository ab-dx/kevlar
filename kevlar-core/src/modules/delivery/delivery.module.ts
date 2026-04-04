import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { DeliveryController } from "./delivery.controller";
import { DeliveryService } from "./delivery.service";
import { AssetModule } from "../asset/asset.module";
import { StorageModule } from "../../core/storage/storage.module";

@Module({
	imports: [
		AssetModule,
		StorageModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: async (configService: ConfigService) => ({
				secret: configService.get<string>("DRM_SECRET_KEY"),
			}),
		}),
	],
	controllers: [DeliveryController],
	providers: [DeliveryService],
})
export class DeliveryModule {}
