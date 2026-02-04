import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string; // e.g., https://uploads.xtraclass.com
}

export class R2Storage {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(config: R2Config) {
    this.bucketName = config.bucketName;
    this.publicUrl = config.publicUrl;

    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  /**
   * Upload a file to R2
   * @param file Buffer containing file data
   * @param filename Original filename
   * @param folder Folder path (e.g., "uploads/question-images")
   * @returns Object with fileUrl, fileKey, and filename
   */
  async uploadFile(
    file: Buffer,
    filename: string,
    folder: string = "uploads"
  ): Promise<{
    fileUrl: string;
    fileKey: string;
    filename: string;
  }> {
    // Generate unique filename to prevent collisions
    const ext = filename.split(".").pop() || "bin";
    const uniqueFilename = `${nanoid()}.${ext}`;
    const fileKey = `${folder}/${uniqueFilename}`;

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
          Body: file,
          ContentType: this.getContentType(filename),
        })
      );

      const fileUrl = `${this.publicUrl}/${fileKey}`;
      return {
        fileUrl,
        fileKey,
        filename: uniqueFilename,
      };
    } catch (error) {
      console.error(`❌ Failed to upload file to R2: ${filename}`, error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Upload base64 image to R2
   * @param base64Data Base64 encoded image data
   * @param filename Filename for the image
   * @param folder Folder path
   * @returns Object with fileUrl, fileKey, and filename
   */
  async uploadBase64Image(
    base64Data: string,
    filename: string,
    folder: string = "uploads/images"
  ): Promise<{
    fileUrl: string;
    fileKey: string;
    filename: string;
  }> {
    // Remove data URL prefix if present
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64String, "base64");

    return this.uploadFile(buffer, filename, folder);
  }

  /**
   * Delete a file from R2
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
        })
      );
      console.log(`✅ Deleted file from R2: ${fileKey}`);
    } catch (error) {
      console.error(`❌ Failed to delete file from R2: ${fileKey}`, error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get a file from R2
   */
  async getFile(fileKey: string): Promise<Buffer> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileKey,
        })
      );

      if (!response.Body) {
        throw new Error("Empty response body");
      }

      const buffer = await this.streamToBuffer(response.Body as any);
      return buffer;
    } catch (error) {
      console.error(`❌ Failed to get file from R2: ${fileKey}`, error);
      throw new Error(`Failed to get file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Get a presigned URL for temporary access (useful for direct client uploads)
   */
  async getPresignedUrl(
    fileKey: string,
    expirationSeconds: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn: expirationSeconds,
      });

      return url;
    } catch (error) {
      console.error(`❌ Failed to generate presigned URL for: ${fileKey}`, error);
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Convert stream to buffer
   */
  private async streamToBuffer(stream: any): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk: Uint8Array) => {
        chunks.push(chunk);
      });
      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
      stream.on("error", (error: Error) => {
        reject(error);
      });
    });
  }

  /**
   * Determine content type based on filename
   */
  private getContentType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
      txt: "text/plain",
      csv: "text/csv",
      json: "application/json",
    };
    return contentTypes[ext] || "application/octet-stream";
  }
}

/**
 * Initialize R2 storage from environment variables
 */
export function initializeR2Storage(): R2Storage {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME || "xtraclass-uploads";
  const publicUrl = process.env.R2_PUBLIC_URL || "https://uploads.xtraclass.com";

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 configuration. Please set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY"
    );
  }

  return new R2Storage({
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
  });
}
