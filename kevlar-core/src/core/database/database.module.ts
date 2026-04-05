import { Module, Global } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { tenantAwarePlugin } from "./tenant.plugin";

@Global()
@Module({
	imports: [
		MongooseModule.forRootAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				uri: configService.get<string>("MONGO_URI"),
				connectionFactory: (connection) => {
					connection.plugin(tenantAwarePlugin);
					return connection;
				},
			}),
			inject: [ConfigService],
		}),
	],
	exports: [MongooseModule],
})
export class DatabaseModule {}
