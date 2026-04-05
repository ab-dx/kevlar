import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";

@Global()
@Module({
	imports: [
		BullModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				connection: {
					host: configService.get<string>("REDIS_HOST") || "localhost",
					port: parseInt(configService.get<string>("REDIS_PORT") || "6379", 10),
				},
			}),
			inject: [ConfigService],
		}),
	],
	exports: [BullModule],
})
export class QueueModule {}
