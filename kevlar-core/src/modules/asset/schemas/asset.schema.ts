import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export enum AssetStatus {
	DRAFT = "Draft",
	IN_REVIEW = "In_Review",
	APPROVED = "Approved",
	PUBLISHED = "Published",
	ARCHIVED = "Archived",
}

@Schema({
	discriminatorKey: "assetType",
	timestamps: true,
	collection: "assets",
})
export class Asset extends Document {
	@Prop({ type: String, required: true, index: true })
	tenantId: string;

	@Prop({ type: String, required: true })
	originalFilename: string;

	@Prop({ type: String, required: true })
	minioObjectKey: string;

	@Prop({ type: String, required: true })
	mimeType: string;

	@Prop({ type: Number, required: true, min: 0 })
	sizeBytes: number;

	@Prop({
		type: String,
		enum: AssetStatus,
		default: AssetStatus.DRAFT,
		index: true,
	})
	status: AssetStatus;

	@Prop({ type: [String], index: true, default: [] })
	tags: string[];

	@Prop({ type: Number, default: 1 })
	version: number;

	@Prop({ type: Date, default: null })
	licenseExpirationDate: Date;

	@Prop({ type: [String], default: [] })
	allowedDomains: string[];
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
