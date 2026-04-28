import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

export interface WatermarkData {
  tenantId: string;
  actorId: string;
  timestamp: number;
  versionId: string;
  familyId: string;
}

export interface EmbedResult {
  success: boolean;
  outputBuffer: Buffer | null;
  error?: string;
}

@Injectable()
export class WatermarkService {
  async embedWatermark(
    inputBuffer: Buffer,
    mimeType: string,
    data: WatermarkData,
  ): Promise<EmbedResult> {
    try {
      const watermarkString = this.encodeWatermark(data);
      console.log(`[Watermark-Embed] DEBUG: watermarkString (base64): ${watermarkString}`);
      console.log(`[Watermark-Embed] DEBUG: inputBuffer size: ${inputBuffer.length}, mimeType: ${mimeType}`);

      if (mimeType.startsWith('image/')) {
        return await this.embedInImage(inputBuffer, watermarkString);
      } else if (mimeType === 'application/pdf') {
        return await this.embedInPdf(inputBuffer, watermarkString);
      } else {
        return { success: false, outputBuffer: null, error: 'Unsupported mime type' };
      }
    } catch (error) {
      return { success: false, outputBuffer: null, error: error.message };
    }
  }

  extractWatermark(buffer: Buffer, mimeType: string): Promise<WatermarkData | null> {
    try {
      console.log(`[Watermark-Extract] DEBUG: buffer size: ${buffer.length}, mimeType: ${mimeType}`);
      if (mimeType.startsWith('image/')) {
        return this.extractFromImage(buffer);
      } else if (mimeType === 'application/pdf') {
        return Promise.resolve(this.extractFromPdf(buffer));
      }
      return Promise.resolve(null);
    } catch (e) {
      console.log(`[Watermark-Extract] DEBUG: exception: ${e.message}`);
      return Promise.resolve(null);
    }
  }

  private encodeWatermark(data: WatermarkData): string {
    const raw = `${data.tenantId}:${data.actorId}:${data.timestamp}:${data.versionId}:${data.familyId}`;
    return Buffer.from(raw).toString('base64');
  }

  private decodeWatermark(encoded: string): WatermarkData | null {
    try {
      const raw = Buffer.from(encoded, 'base64').toString('utf-8');
      const parts = raw.split(':');
      if (parts.length !== 5) return null;

      return {
        tenantId: parts[0],
        actorId: parts[1],
        timestamp: parseInt(parts[2], 10),
        versionId: parts[3],
        familyId: parts[4],
      };
    } catch {
      return null;
    }
  }

  private async embedInImage(
    buffer: Buffer,
    watermark: string,
  ): Promise<EmbedResult> {
    try {
      console.log(`[Watermark-Embed-Image] DEBUG: Decoding image to raw pixels...`);
      const { data, info } = await sharp(buffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      console.log(`[Watermark-Embed-Image] DEBUG: Image dimensions: ${info.width}x${info.height}, channels: ${info.channels}, pixel count: ${data.length}`);

      const pixels = new Uint8Array(data);
      const watermarkBits = this.stringToBits(watermark);
      console.log(`[Watermark-Embed-Image] DEBUG: watermarkBits length: ${watermarkBits.length}, first 32 bits: ${watermarkBits.slice(0, 32)}`);

      if (watermarkBits.length > pixels.length / 3) {
        return { success: false, outputBuffer: null, error: 'Watermark too large for image' };
      }

      console.log(`[Watermark-Embed-Image] DEBUG: Embedding ${watermarkBits.length} bits into pixels...`);
      for (let i = 0; i < watermarkBits.length; i++) {
        const pixelIndex = i * 3;
        const originalValue = pixels[pixelIndex];
        pixels[pixelIndex] = (pixels[pixelIndex] & 0xFE) | watermarkBits[i];
        if (i < 10) {
          console.log(`[Watermark-Embed-Image] DEBUG: Pixel ${i}: ${originalValue} -> ${pixels[pixelIndex]} (bit ${watermarkBits[i]})`);
        }
      }

      console.log(`[Watermark-Embed-Image] DEBUG: Encoding to PNG...`);
      const outputBuffer = await sharp(pixels, {
        raw: { width: info.width, height: info.height, channels: info.channels },
      })
        .png()
        .toBuffer();

      console.log(`[Watermark-Embed-Image] DEBUG: Output buffer size: ${outputBuffer.length}`);
      return { success: true, outputBuffer };
    } catch (error) {
      console.log(`[Watermark-Embed-Image] DEBUG: Error: ${error.message}`);
      return { success: false, outputBuffer: null, error: error.message };
    }
  }

  private async extractFromImage(buffer: Buffer): Promise<WatermarkData | null> {
    try {
      console.log(`[Watermark-Extract-Image] DEBUG: Decoding image to raw pixels...`);
      const { data } = await sharp(buffer)
        .raw()
        .toBuffer({ resolveWithObject: true });

      console.log(`[Watermark-Extract-Image] DEBUG: Image pixel data length: ${data.length}`);

      const pixels = new Uint8Array(data);
      const maxBits = 2048;
      const bits: number[] = [];

      for (let i = 0; i < maxBits && i * 3 < pixels.length; i++) {
        bits.push(pixels[i * 3] & 1);
      }

      console.log(`[Watermark-Extract-Image] DEBUG: Extracted ${bits.length} bits, first 32: ${bits.slice(0, 32)}`);
      console.log(`[Watermark-Extract-Image] DEBUG: First 10 pixel LSBs: ${bits.slice(0, 10).map((b, i) => `pixel${i}:${b}`).join(', ')}`);

      const extracted = this.bitsToString(bits);
      console.log(`[Watermark-Extract-Image] DEBUG: Extracted string (first 100 chars): ${extracted.substring(0, 100)}`);

      // Use full extracted string without terminator truncation
      const cleanStr = extracted;
      console.log(`[Watermark-Extract-Image] DEBUG: Using full string (no terminator check)`);

      console.log(`[Watermark-Extract-Image] DEBUG: Attempting base64 decode...`);
      let decoded: string;
      try {
        decoded = Buffer.from(cleanStr, 'base64').toString('utf-8');
      } catch (e) {
        console.log(`[Watermark-Extract-Image] DEBUG: base64 decode failed: ${e.message}`);
        return null;
      }
      console.log(`[Watermark-Extract-Image] DEBUG: Decoded string: ${decoded}`);

      if (!decoded.includes(':')) {
        console.log(`[Watermark-Extract-Image] DEBUG: No colon found in decoded string, returning null`);
        return null;
      }

      const parts = decoded.split(':');
      if (parts.length !== 5) {
        console.log(`[Watermark-Extract-Image] DEBUG: Parts count ${parts.length} != 5, returning null`);
        return null;
      }

      console.log(`[Watermark-Extract-Image] DEBUG: SUCCESS! Watermark found:`, { tenantId: parts[0], actorId: parts[1] });
      return {
        tenantId: parts[0],
        actorId: parts[1],
        timestamp: parseInt(parts[2], 10),
        versionId: parts[3],
        familyId: parts[4],
      };
    } catch (e) {
      console.log(`[Watermark-Extract-Image] DEBUG: Exception: ${e.message}`);
      return null;
    }
  }

  private async embedInPdf(buffer: Buffer, watermark: string): Promise<EmbedResult> {
    try {
      const pdfStr = buffer.toString('binary');
      const marker = `<<WATERMARK:${watermark}>>`;
      const watermarkedPdf = pdfStr + '\n' + marker;

      return {
        success: true,
        outputBuffer: Buffer.from(watermarkedPdf, 'binary'),
      };
    } catch (error) {
      return { success: false, outputBuffer: null, error: error.message };
    }
  }

  private extractFromPdf(buffer: Buffer): WatermarkData | null {
    try {
      const pdfStr = buffer.toString('binary');
      const regex = /<<WATERMARK:([A-Za-z0-9+/=]+)>>/;
      const match = pdfStr.match(regex);

      if (!match || !match[1]) return null;

      const decoded = Buffer.from(match[1], 'base64').toString('utf-8');
      const parts = decoded.split(':');

      if (parts.length !== 5) return null;

      return {
        tenantId: parts[0],
        actorId: parts[1],
        timestamp: parseInt(parts[2], 10),
        versionId: parts[3],
        familyId: parts[4],
      };
    } catch {
      return null;
    }
  }

  private stringToBits(str: string): number[] {
    const bits: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      for (let j = 7; j >= 0; j--) {
        bits.push((charCode >> j) & 1);
      }
    }
    const terminator = [0,0,0,0,0,0,0,0,0,1,1,0,1,1,0,1,0,0,0,1,1,0,1,1,0,0,0,1,0,0,0,0];
    bits.push(...terminator);
    return bits;
  }

  private bitsToString(bits: number[]): string {
    const bytes: number[] = [];
    for (let i = 0; i < bits.length; i += 8) {
      let charCode = 0;
      for (let j = 0; j < 8; j++) {
        if (i + j < bits.length) {
          charCode = (charCode << 1) | bits[i + j];
        }
      }
      if (charCode === 0) break;
      bytes.push(charCode);
    }
    return String.fromCharCode(...bytes);
  }
}