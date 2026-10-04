import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ObjectStorage, StoredObject } from "./types";

/**
 * S3-compatible private storage (AWS S3, Cloudflare R2, Supabase Storage,
 * MinIO…). The bucket must NOT allow public reads; objects are written
 * without ACLs and served only via authenticated API routes.
 */
export class S3Storage implements ObjectStorage {
  readonly name = "s3";
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly customEndpoint: boolean;

  constructor(config: {
    bucket?: string;
    region?: string;
    endpoint?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    if (!config.bucket) throw new Error("STORAGE_BUCKET is required for the s3 storage provider");
    this.bucket = config.bucket;
    this.customEndpoint = Boolean(config.endpoint);
    this.client = new S3Client({
      region: config.region ?? "auto",
      endpoint: config.endpoint,
      forcePathStyle: Boolean(config.endpoint),
      credentials:
        config.accessKeyId && config.secretAccessKey
          ? { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey }
          : undefined,
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
        // Only request SSE on AWS itself; some S3-compatible services reject the header.
        ServerSideEncryption: this.customEndpoint ? undefined : "AES256",
      }),
    );
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) return null;
      const bytes = await result.Body.transformToByteArray();
      return { data: Buffer.from(bytes), contentType: result.ContentType ?? "image/jpeg" };
    } catch (error) {
      if (error instanceof NoSuchKey) return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
