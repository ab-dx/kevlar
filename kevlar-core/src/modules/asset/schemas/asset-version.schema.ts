import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true })
export class AssetVersion extends Document {
	@Prop({
		type: MongooseSchema.Types.ObjectId,
		ref: "AssetFamily",
		required: true,
		index: true,
	})
	familyId: string;

	@Prop({ required: true })
	tenantId: string;

	@Prop({ required: true })
	versionNumber: number;

	// --- Universal File Metadata ---
	@Prop({ required: true })
	minioObjectKey: string;

	@Prop({ required: true })
	originalFilename: string;

	@Prop({ required: true })
	mimeType: string;

	@Prop({ required: true })
	sizeBytes: number;

	@Prop({ required: true })
	uploadedBy: string;

	@Prop({ type: MongooseSchema.Types.Mixed, default: {} })
	metadata: Record<string, any>;
}

export const AssetVersionSchema = SchemaFactory.createForClass(AssetVersion);
AssetVersionSchema.index({ familyId: 1, versionNumber: 1 }, { unique: true });
