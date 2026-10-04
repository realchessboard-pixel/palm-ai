import type { ObjectStorage, StoredObject } from "./types";

/** In-memory storage for tests and ephemeral demos. */
export class MemoryStorage implements ObjectStorage {
  readonly name = "memory";
  readonly objects = new Map<string, StoredObject>();

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    this.objects.set(key, { data: Buffer.from(data), contentType });
  }

  async get(key: string): Promise<StoredObject | null> {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.objects.delete(key);
  }
}
