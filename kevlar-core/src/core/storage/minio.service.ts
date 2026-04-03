import {
	Injectable,
	InternalServerErrorException,
	OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Minio from "minio";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class MinioService implements OnModuleInit {
	private minioClient: Minio.Client;
	private bucketName: string;

	constructor(private configService: ConfigService) {
		this.bucketName =
			this.configService.get<string>("MINIO_DEFAULT_BUCKET") ||
			"kevlar-storage";

		this.minioClient = new Minio.Client({
			endPoint: this.configService.get<string>("MINIO_ENDPOINT") || "localhost",
			port: parseInt(
				this.configService.get<string>("MINIO_PORT") || "9000",
				10,
			),
			useSSL: this.configService.get<string>("MINIO_USE_SSL") === "true",
			accessKey: this.configService.get<string>("MINIO_ACCESS_KEY") || "admin",
			secretKey:
				this.configService.get<string>("MINIO_SECRET_KEY") || "adminpassword",
		});
	}
	async onModuleInit() {
		try {
			const exists = await this.minioClient.bucketExists(this.bucketName);
			if (!exists) {
				await this.minioClient.makeBucket(this.bucketName, "us-east-1");
				console.log(
					`[MinIO] Bucket '${this.bucketName}' created successfully.`,
				);
			} else {
				console.log(
					`[MinIO] Bucket '${this.bucketName}' already exists. Ready.`,
				);
			}
		} catch (error) {
			console.error(
				`[MinIO] Failed to initialize bucket '${this.bucketName}':`,
				error,
			);
		}
	}

	async generateUploadUrl(
		tenantId: string,
		filename: string,
		mimeType: string,
	) {
		try {
			const objectKey = `${tenantId}/${uuidv4()}-${filename}`;

			const uploadUrl = await this.minioClient.presignedPutObject(
				this.bucketName,
				objectKey,
				3600,
			);

			return { uploadUrl, objectKey };
		} catch (error) {
			console.error("MinIO Upload URL Generation Failed:", error);
			throw new InternalServerErrorException("Could not generate upload link");
		}
	}

	async generateDownloadUrl(objectKey: string) {
		try {
			return await this.minioClient.presignedGetObject(
				this.bucketName,
				objectKey,
				3600,
			);
		} catch (error) {
			console.error("MinIO Download URL Generation Failed:", error);
			throw new InternalServerErrorException(
				"Could not generate download link",
			);
		}
	}
}
