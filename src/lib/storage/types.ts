export interface StoredObject {
  data: Buffer;
  contentType: string;
}

/**
 * Private object storage. Implementations must never make objects publicly
 * readable; images are only served through authenticated API routes.
 */
export interface ObjectStorage {
  readonly name: string;
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}
