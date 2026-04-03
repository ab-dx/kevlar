import { Module, Global } from "@nestjs/common";
import { AssetGateway } from "./asset.gateway";

@Global()
@Module({
	providers: [AssetGateway],
	exports: [AssetGateway],
})
export class EventsModule {}
