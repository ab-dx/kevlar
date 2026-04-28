import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { AssetFamily } from './schemas/asset-family.schema';
import { AssetVersion } from './schemas/asset-version.schema';
import { AssetGateway } from './asset.gateway';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/schemas/audit-log.schema';
import { MinioService } from '../../core/storage/minio.service';
import { WatermarkService } from './watermark.service';

@Processor('asset-processing', {
  concurrency: 1,
})
export class AssetProcessor extends WorkerHost {
  private genAI: GoogleGenerativeAI;

  constructor(
    @InjectModel(AssetFamily.name) private familyModel: Model<AssetFamily>,
    @InjectModel(AssetVersion.name) private versionModel: Model<AssetVersion>,
    private configService: ConfigService,
    private minioService: MinioService,
    private watermarkService: WatermarkService,
    private assetGateway: AssetGateway,
    private auditService: AuditService,
  ) {
    super();
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    }
  }

  async process(job: Job<any>) {
    const jobName = job.name;

    if (jobName === 'semantic.tag') {
      return this.processSemanticTagging(job);
    }

    if (jobName === 'apply.watermark') {
      return this.processWatermark(job);
    }

    return this.processMedia(job);
  }

  private async processMedia(
    job: Job<{ familyId: string; versionId: string; tenantId: string }>,
  ) {
    const { familyId, versionId, tenantId } = job.data;

    console.log(
      `[Processor] Starting analysis for Version ${versionId} of Family ${familyId}...`,
    );

    const version = await this.versionModel.findOne({
      _id: versionId,
      tenantId,
    });
    if (!version) {
      console.error(`[Processor] Version ${versionId} not found.`);
      return;
    }

    if (version.mimeType.startsWith('video/')) {
      version.metadata = {
        resolution: '1920x1080',
        fps: 24,
        codec: 'h264',
        durationSeconds: 120,
        mockProcessed: true,
      };
    } else if (version.mimeType.startsWith('image/')) {
      version.metadata = {
        width: 4000,
        height: 3000,
        colorSpace: 'sRGB',
        mockProcessed: true,
      };
    }

    await version.save();

    await this.auditService.logEvent(
      tenantId,
      familyId,
      'system-worker',
      AuditAction.ASSET_UPDATED,
      { note: 'Background metadata extraction complete', versionId },
    );

    this.assetGateway.server.to(tenantId).emit('assetProcessed', {
      familyId,
      versionId,
      message: 'Processing complete',
    });

    console.log(
      `[Processor] Finished processing Version ${versionId}. WebSocket fired.`,
    );
  }

  private async processWatermark(
    job: Job<{
      familyId: string;
      versionId: string;
      tenantId: string;
      actorId: string;
      minioObjectKey: string;
      mimeType: string;
    }>,
  ) {
    const { familyId, versionId, tenantId, actorId, minioObjectKey, mimeType } =
      job.data;

    console.log(
      `[Watermark] Starting for Version ${versionId} of Family ${familyId}...`,
    );

    try {
      const objectBuffer = await this.minioService.getObjectAsBuffer(minioObjectKey);
      console.log(`[Watermark] DEBUG: Fetched file, size: ${objectBuffer.length}, mimeType: ${mimeType}`);

      const watermarkData = {
        tenantId,
        actorId,
        timestamp: Date.now(),
        versionId,
        familyId,
      };
      console.log(`[Watermark] DEBUG: Watermark data: ${JSON.stringify(watermarkData)}`);

      console.log(`[Watermark] DEBUG: Calling embedWatermark...`);
      const result = await this.watermarkService.embedWatermark(
        objectBuffer,
        mimeType,
        watermarkData,
      );
      console.log(`[Watermark] DEBUG: embedWatermark returned, success: ${result.success}, error: ${result.error}, outputSize: ${result.outputBuffer?.length}`);

      if (!result.success || !result.outputBuffer) {
        console.warn(
          `[Watermark] Failed to embed watermark for version ${versionId}: ${result.error}`,
        );
        console.log(`[Watermark] Proceeding without watermark.`);
        return;
      }

      const watermarkedKey = minioObjectKey.replace(
        /\/([^/]+)$/,
        `/watermarked-$1`,
      );

      const actualMimeType = mimeType.startsWith('image/') ? 'image/png' : mimeType;
      console.log(`[Watermark] DEBUG: Uploading watermarked file to: ${watermarkedKey}, mimeType: ${actualMimeType}`);

      await this.minioService.uploadBuffer(watermarkedKey, result.outputBuffer, actualMimeType);
      console.log(`[Watermark] DEBUG: Upload complete`);

      const version = await this.versionModel.findOne({ _id: versionId, tenantId });
      if (version) {
        version.metadata = version.metadata || {};
        version.metadata.originalObjectKey = version.minioObjectKey;
        version.metadata.originalMimeType = version.mimeType;
        version.minioObjectKey = watermarkedKey;
        version.mimeType = actualMimeType;
        version.metadata.watermarked = true;
        version.metadata.watermarkTimestamp = watermarkData.timestamp;
        await version.save();
        console.log(`[Watermark] DEBUG: Version updated, minioObjectKey: ${version.minioObjectKey}`);
      }

      await this.auditService.logEvent(
        tenantId,
        familyId,
        'system-worker',
        AuditAction.ASSET_UPDATED,
        { note: 'Watermark applied', versionId, watermarkedKey },
      );

      this.assetGateway.server.to(tenantId).emit('watermarkApplied', {
        familyId,
        versionId,
        watermarkedKey,
      });

      console.log(
        `[Watermark] Finished for Version ${versionId}. WebSocket fired.`,
      );
    } catch (error) {
      console.error(
        `[Watermark] Error for version ${versionId}:`,
        error.message,
      );
      console.log(`[Watermark] Proceeding without watermark due to error.`);
    }
  }

  private async processSemanticTagging(
    job: Job<{
      familyId: string;
      versionId: string;
      tenantId: string;
      minioObjectKey: string;
      mimeType: string;
    }>,
  ) {
    const { familyId, versionId, tenantId, minioObjectKey, mimeType } =
      job.data;

    console.log(
      `[SemanticTagger] Starting for Version ${versionId} of Family ${familyId}...`,
    );

    if (!this.genAI) {
      console.warn(
        '[SemanticTagger] GEMINI_API_KEY not configured. Skipping semantic tagging.',
      );
      return;
    }

    try {
      const family = await this.familyModel.findOne({
        _id: familyId,
        tenantId,
      });
      if (!family) {
        console.error(`[SemanticTagger] Family ${familyId} not found.`);
        return;
      }

      const currentTags = family.tags || [];
      let newTags: string[] = [];

      if (mimeType.startsWith('image/')) {
        newTags = await this.generateTagsFromImage(minioObjectKey);
      } else if (mimeType.startsWith('video/')) {
        newTags = await this.generateTagsFromVideo(minioObjectKey, mimeType);
      } else {
        newTags = await this.generateTagsFromDocument(minioObjectKey, mimeType);
      }

      if (newTags.length > 0) {
        const uniqueNewTags = newTags.filter(
          (tag) => !currentTags.includes(tag),
        );
        const allTags = [...currentTags, ...uniqueNewTags];

        family.tags = allTags;
        await family.save();

        console.log(
          `[SemanticTagger] Added tags to family ${familyId}:`,
          uniqueNewTags,
        );

        this.assetGateway.server.to(tenantId).emit('semanticTagsGenerated', {
          familyId,
          versionId,
          newTags: uniqueNewTags,
          allTags,
        });
      }
    } catch (error) {
      console.error(
        `[SemanticTagger] Failed for family ${familyId}:`,
        error.message,
      );
    }

    console.log(`[SemanticTagger] Finished for Version ${versionId}.`);
  }

  private async generateTagsFromImage(objectKey: string): Promise<string[]> {
    try {
      const imageBuffer = await this.minioService.getObjectAsBuffer(objectKey);

      const resizedBuffer = await sharp(imageBuffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer();

      const base64 = resizedBuffer.toString('base64');

      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { maxOutputTokens: 100 },
      });

      const result = await model.generateContent([
        {
          inlineData: { data: base64, mimeType: 'image/jpeg' },
        },
        'Analyze this image and provide 5-8 relevant semantic tags that describe the content, scene, objects, style, and context. Return only a comma-separated list of tags, no explanation.',
      ]);

      const response = result.response.text();
      const tags = response
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      return tags;
    } catch (error) {
      console.error('[SemanticTagger] Image tagging failed:', error.message);
      return [];
    }
  }

  private async generateTagsFromVideo(
    objectKey: string,
    mimeType: string,
  ): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { maxOutputTokens: 100 },
      });

      const result = await model.generateContent([
        `Analyze this video file (mimeType: ${mimeType}, objectKey: ${objectKey}). Provide 5-8 semantic tags that describe the video content, type, genre, subject matter, and context. Return only a comma-separated list of tags, no explanation.`,
      ]);

      const response = result.response.text();
      const tags = response
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      return tags;
    } catch (error) {
      console.error('[SemanticTagger] Video tagging failed:', error.message);
      return [];
    }
  }

  private async generateTagsFromDocument(
    objectKey: string,
    mimeType: string,
  ): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { maxOutputTokens: 100 },
      });

      const result = await model.generateContent([
        `Analyze this document file (mimeType: ${mimeType}, filename: ${objectKey}). Provide 5-8 semantic tags that describe the document content, type, format, subject matter, and context. Return only a comma-separated list of tags, no explanation.`,
      ]);

      const response = result.response.text();
      const tags = response
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      return tags;
    } catch (error) {
      console.error('[SemanticTagger] Document tagging failed:', error.message);
      return [];
    }
  }
}
