import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

@Schema({ timestamps: true })
export class Delivery extends Document {
	@Prop({ required: true, index: true })
	tenantId: string;

	@Prop({
		type: MongooseSchema.Types.ObjectId,
		ref: "AssetFamily",
		required: true,
	})
	familyId: string;

	@Prop({ required: true })
	versionId: string;

	@Prop({ required: true })
	token: string;

	@Prop({ required: true })
	expiresAt: Date;

	@Prop({ required: true })
	createdBy: string;

	@Prop({ default: true })
	isActive: boolean;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);

DeliverySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
