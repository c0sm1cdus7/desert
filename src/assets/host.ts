import type { Database } from "../local/database.ts";
import { openPrivateAssetStore } from "./storage.ts";
import { installPrivateAssetStore } from "./installation.ts";
import { claimPrivateAssetStore } from "./store-binding.ts";
import type { AssetQuota } from "./policy.ts";

export type PrivateImageStorage = Readonly<{ directory: string; quota: AssetQuota }>;
export const privateImageTransferLimits = Object.freeze({ activeUploads: 2, activeReads: 4, deadlineMs: 90_000, idleMs: 15_000 });

export async function privateImageHost(database: Database, options: PrivateImageStorage) {
  const store = await openPrivateAssetStore(options.directory);
  const installation = await database.transaction(client => installPrivateAssetStore(client, store.id, options.quota));
  const lease = await claimPrivateAssetStore(store, installation);
  const closing = new AbortController(), operations = new Set<Promise<unknown>>();
  let uploads = 0, reads = 0, completion: Promise<void> | undefined;
  const assertOpen = () => { if (closing.signal.aborted) throw new Error("PRIVATE_ASSET_HOST_CLOSED"); };
  function operation<T>(kind: "upload" | "read", execute: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal) {
    assertOpen();
    if (kind === "upload" ? uploads >= privateImageTransferLimits.activeUploads : reads >= privateImageTransferLimits.activeReads) {
      return Promise.reject(new Error("ASSET_TRANSFER_BUSY"));
    }
    if (kind === "upload") uploads++; else reads++;
    const timeout = AbortSignal.timeout(privateImageTransferLimits.deadlineMs);
    const combined = AbortSignal.any([closing.signal, timeout, ...(signal ? [signal] : [])]);
    const pending = Promise.resolve().then(() => {
      if (combined.aborted) throw new Error("ASSET_TRANSFER_CANCELLED");
      return execute(combined);
    }).finally(() => {
      operations.delete(pending);
      if (kind === "upload") uploads--; else reads--;
    });
    operations.add(pending);
    return pending;
  }
  return Object.freeze({ store, assertOpen,
    upload<T>(execute: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal) { return operation("upload", execute, signal); },
    read<T>(execute: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal) { return operation("read", execute, signal); },
    close() {
      if (!completion) {
        closing.abort();
        completion = Promise.allSettled([...operations]).then(() => lease.close());
      }
      return completion;
    },
  });
}
export type PrivateImageHost = Awaited<ReturnType<typeof privateImageHost>>;
export function requirePrivateImageHost(host?: PrivateImageHost) {
  if (!host) throw new Error("PRIVATE_IMAGE_STORAGE_NOT_INSTALLED");
  host.assertOpen();
  return host;
}
