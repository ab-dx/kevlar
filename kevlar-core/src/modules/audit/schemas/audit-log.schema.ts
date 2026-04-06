import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema, Types } from "mongoose";

export enum AuditAction {
	ASSET_CREATED = "Asset_Created",
	ASSET_UPDATED = "ASSET_UPDATED",
	STATE_CHANGED = "State_Changed",
	TAGS_UPDATED = "Tags_Updated",
	SECURE_LINK_GENERATED = "Secure_Link_Generated",
	ASSET_DOWNLOADED = "Asset_Downloaded",
	WORKFLOW_STATE_CHANGED = "WORKFLOW_STATE_CHANGED",
}

// updatedAt is disabled because logs must be immutable
@Schema({
	timestamps: { createdAt: true, updatedAt: false },
	collection: "audit_logs",
})
export class AuditLog extends Document {
	@Prop({ type: String, required: true, index: true })
	tenantId: string;

	@Prop({ type: MongooseSchema.Types.ObjectId, required: true, index: true })
	assetFamilyId: Types.ObjectId;

	@Prop({ type: String, required: true })
	actorId: string;

	@Prop({ type: String, enum: AuditAction, required: true })
	action: AuditAction;

	@Prop({ type: MongooseSchema.Types.Mixed })
	details: Record<string, any>;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
