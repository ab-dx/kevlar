import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { Asset, AssetSchema } from "./schemas/asset.schema";
import {
	VideoAssetSchema,
	AudioAssetSchema,
	ImageAssetSchema,
} from "./schemas/discriminators.schema";
import { AssetService } from "./asset.service";
import { AssetController } from "./asset.controller";
import { StorageModule } from "../../core/storage/storage.module";
import { AssetProcessor } from "./asset.processor";

@Module({
	imports: [
		MongooseModule.forFeature([
			{
				name: Asset.name,
				schema: AssetSchema,
				discriminators: [
					{ name: "VideoAsset", schema: VideoAssetSchema },
					{ name: "AudioAsset", schema: AudioAssetSchema },
					{ name: "ImageAsset", schema: ImageAssetSchema },
				],
			},
		]),
		BullModule.registerQueue({
			name: "asset-processing",
		}),
		StorageModule,
	],
	providers: [AssetService, AssetProcessor],
	controllers: [AssetController],
	exports: [MongooseModule, AssetService],
})
export class AssetModule {}
