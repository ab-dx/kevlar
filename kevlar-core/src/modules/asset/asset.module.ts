import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BullModule } from "@nestjs/bullmq";
import { AssetService } from "./asset.service";
import { AssetController } from "./asset.controller";
import { StorageModule } from "../../core/storage/storage.module";
import { AssetProcessor } from "./asset.processor";
import { WorkflowService } from "./workflow.service";
import { AssetFamily, AssetFamilySchema } from "./schemas/asset-family.schema";
import {
	AssetVersion,
	AssetVersionSchema,
} from "./schemas/asset-version.schema";
import { AssetGateway } from "./asset.gateway";

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: AssetFamily.name, schema: AssetFamilySchema },
			{ name: AssetVersion.name, schema: AssetVersionSchema },
		]),
		BullModule.registerQueue({
			name: "asset-processing",
		}),
		StorageModule,
	],
	providers: [AssetService, WorkflowService, AssetProcessor, AssetGateway],
	controllers: [AssetController],
	exports: [MongooseModule, AssetService, WorkflowService, MongooseModule],
})
export class AssetModule {}
