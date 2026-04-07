import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";
import { AssetStatus } from "../enums/asset-status.enum";

@Schema({ timestamps: true })
export class AssetFamily extends Document {
	@Prop({ required: true, index: true })
	tenantId: string;

	@Prop({ required: true })
	title: string;

	@Prop()
	description?: string;

	@Prop({ type: String, enum: AssetStatus, default: AssetStatus.DRAFT })
	status: AssetStatus;

	@Prop({ type: MongooseSchema.Types.ObjectId, ref: "AssetVersion" })
	activeVersionId?: string;

	@Prop({ type: Number, default: 1 })
	nextVersionNumber: number;

	@Prop({ required: true })
	createdBy: string;

	@Prop({ type: [String], default: [] })
	tags: string[];

	@Prop({ type: MongooseSchema.Types.Mixed, default: {} })
	customMetadata: Record<string, any>;
}

export const AssetFamilySchema = SchemaFactory.createForClass(AssetFamily);

AssetFamilySchema.index({ tenantId: 1, status: 1 });
