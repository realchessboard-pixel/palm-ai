import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ObjectStorage, StoredObject } from "./types";

const KEY_PATTERN = /^[a-z0-9/_-]+\.jpg$/i;

/**
 * Filesystem storage for local development. Files live OUTSIDE /public, so
 * they are never served statically. Not suitable for serverless platforms
 * with ephemeral filesystems — use the S3 provider there.
 */
export class LocalStorage implements ObjectStorage {
  readonly name = "local";
  private readonly root: string;

  constructor(dir: string) {
    this.root = path.resolve(dir);
  }

  private resolve(key: string): string {
    if (!KEY_PATTERN.test(key) || key.includes("..")) throw new Error("Invalid storage key");
    const full = path.resolve(this.root, key);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }

  async put(key: string, data: Buffer): Promise<void> {
    const file = this.resolve(key);
    await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
    await writeFile(file, data, { mode: 0o600 });
  }

  async get(key: string): Promise<StoredObject | null> {
    try {
      return { data: await readFile(this.resolve(key)), contentType: "image/jpeg" };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }
}
