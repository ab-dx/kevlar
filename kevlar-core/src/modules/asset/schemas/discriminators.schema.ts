import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Asset } from "./asset.schema";

@Schema()
export class VideoAsset extends Asset {
	@Prop({ required: true })
	resolution: string;

	@Prop({ required: true })
	fps: number;

	@Prop({ required: true })
	videoCodec: string;
}
export const VideoAssetSchema = SchemaFactory.createForClass(VideoAsset);

@Schema()
export class AudioAsset extends Asset {
	@Prop({ required: true })
	sampleRate: number;

	@Prop()
	bpm: number;

	@Prop({ required: true })
	audioCodec: string;
}
export const AudioAssetSchema = SchemaFactory.createForClass(AudioAsset);

@Schema()
export class ImageAsset extends Asset {
	@Prop({ required: true })
	dimensions: string;

	@Prop({ required: true })
	colorSpace: string;
}
export const ImageAssetSchema = SchemaFactory.createForClass(ImageAsset);
