import { R2Storage } from "./r2-storage";
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, existsSync } from "fs";
import path from "path";

/**
 * Abstract storage interface that works with both R2 and local filesystem
 */
export interface IStorage {
  uploadFile(
    file: Buffer,
    filename: string,
    folder?: string
  ): Promise<{ fileUrl: string; fileKey: string; filename: string }>;

  uploadBase64Image(
    base64Data: string,
    filename: string,
    folder?: string
  ): Promise<{ fileUrl: string; fileKey: string; filename: string }>;

  deleteFile(fileKey: string): Promise<void>;
  getFile(fileKey: string): Promise<Buffer>;
}

/**
 * Local filesystem storage implementation
 */
export class LocalStorage implements IStorage {
  private basePath: string;
  private baseUrl: string;

  constructor(basePath: string = "uploads", baseUrl: string = "http://localhost:3000") {
    this.basePath = basePath;
    this.baseUrl = baseUrl;

    // Create base directory if it doesn't exist
    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true });
    }
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    folder: string = "uploads"
  ): Promise<{
    fileUrl: string;
    fileKey: string;
    filename: string;
  }> {
    const dirPath = path.join(this.basePath, folder);

    // Create directory if it doesn't exist
    if (!existsSync(dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }

    // Generate unique filename
    const ext = filename.split(".").pop() || "bin";
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${filename}`;
    const filePath = path.join(dirPath, uniqueFilename);
    const fileKey = path.join(folder, uniqueFilename);

    try {
      writeFileSync(filePath, file);
      const fileUrl = `${this.baseUrl}/${fileKey.replace(/\\/g, "/")}`;

      console.log(`✅ Uploaded file locally: ${fileKey}`);
      return {
        fileUrl,
        fileKey,
        filename: uniqueFilename,
      };
    } catch (error) {
      console.error(`❌ Failed to upload file locally: ${filename}`, error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async uploadBase64Image(
    base64Data: string,
    filename: string,
    folder: string = "uploads/images"
  ): Promise<{
    fileUrl: string;
    fileKey: string;
    filename: string;
  }> {
    const base64String = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64String, "base64");

    return this.uploadFile(buffer, filename, folder);
  }

  async deleteFile(fileKey: string): Promise<void> {
    const filePath = path.join(this.basePath, fileKey);

    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
        console.log(`✅ Deleted file locally: ${fileKey}`);
      }
    } catch (error) {
      console.error(`❌ Failed to delete file locally: ${fileKey}`, error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async getFile(fileKey: string): Promise<Buffer> {
    const filePath = path.join(this.basePath, fileKey);

    try {
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }
      return readFileSync(filePath);
    } catch (error) {
      console.error(`❌ Failed to get file locally: ${fileKey}`, error);
      throw new Error(`Failed to get file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
}

/**
 * Initialize storage based on environment
 * Uses R2 if CLOUDFLARE_ACCOUNT_ID is set, otherwise uses local storage
 */
export function initializeStorage(): IStorage {
  const useR2 =
    process.env.CLOUDFLARE_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY;

  if (useR2) {
    console.log("📦 Using Cloudflare R2 for file storage");
    return new R2Storage({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.R2_BUCKET_NAME || "xtraclass-uploads",
      publicUrl: process.env.R2_PUBLIC_URL || "https://uploads.xtraclass.com",
    });
  } else {
    console.log("📁 Using local filesystem for file storage");
    return new LocalStorage(
      process.env.UPLOADS_DIR || "uploads",
      process.env.UPLOADS_URL || "http://localhost:3000"
    );
  }
}

// Global storage instance
let storage: IStorage;

export function getStorage(): IStorage {
  if (!storage) {
    storage = initializeStorage();
  }
  return storage;
}

export function setStorage(instance: IStorage): void {
  storage = instance;
}
