import { openPrivateAssetStore } from "./storage.ts";
import { processFileBytes } from "./file-processing.ts";
import type { AssetFile } from "./types.ts";
import { privateImageWorkLimits } from "./work.ts";
import { isMediaType, type MediaType } from "../media/rendition-policy.ts";

/** One file to process: where its original is and the media types its fact accepts. */
export type ImageWorkerInput = { directory: string; store: string; reference: string; original: AssetFile; accept: readonly MediaType[] };
if (process.send) {
  const deadline = setTimeout(() => process.exit(1), privateImageWorkLimits.deadlineMs);
  process.once("disconnect", () => process.exit(1));
  process.once("message", async (input: ImageWorkerInput) => {
  try {
    if (!Array.isArray(input.accept) || !input.accept.length || !input.accept.every(isMediaType)) throw new Error("ASSET_PROCESSING_FAILED");
    const store = await openPrivateAssetStore(input.directory);
    if (store.id !== input.store) throw new Error("ASSET_STORE_MISMATCH");
    const metadata = await processFileBytes(store, input.reference, input.original, input.accept);
    process.send!({ metadata }, () => { clearTimeout(deadline); process.exit(0); });
  } catch (error) {
    const message = error instanceof Error && /^[A-Z][A-Z_]+$/.test(error.message) ? error.message : "ASSET_PROCESSING_FAILED";
    process.send!({ error: message }, () => { clearTimeout(deadline); process.exit(1); });
  }
  });
}
