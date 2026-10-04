import "server-only";
import { randomUUID } from "node:crypto";
import { getEnv } from "@/lib/config/env";
import { LocalStorage } from "./local";
import { MemoryStorage } from "./memory";
import { S3Storage } from "./s3";
import type { ObjectStorage } from "./types";

export type { ObjectStorage, StoredObject } from "./types";

/** Object keys are generated server-side only; user filenames are never used. */
export const KEY_PATTERN = /^palms\/\d{4}\/\d{2}\/[a-f0-9-]{36}(-thumb)?\.jpg$/;

export function generateImageKeys(now = new Date()): { imageKey: string; thumbnailKey: string } {
  const id = randomUUID();
  const prefix = `palms/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return { imageKey: `${prefix}/${id}.jpg`, thumbnailKey: `${prefix}/${id}-thumb.jpg` };
}

export function assertValidKey(key: string): void {
  if (!KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
}

let instance: ObjectStorage | undefined;

export function getStorage(): ObjectStorage {
  if (instance) return instance;
  const env = getEnv();
  switch (env.STORAGE_PROVIDER) {
    case "s3":
      instance = new S3Storage({
        bucket: env.STORAGE_BUCKET,
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      });
      break;
    case "memory":
      instance = new MemoryStorage();
      break;
    default:
      instance = new LocalStorage(env.STORAGE_LOCAL_DIR);
  }
  return instance;
}

/** Test helper. */
export function setStorage(storage: ObjectStorage | undefined): void {
  instance = storage;
}
