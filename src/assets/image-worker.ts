import { openPrivateAssetStore } from "./storage.ts";
import { optimizeImageBytes } from "./image-processing.ts";
import { optimizeMediaBytes } from "./media-processing.ts";
import type { AssetFile } from "./types.ts";
import { privateImageWorkLimits } from "./work.ts";

export type ImageWorkerInput = { directory: string; store: string; reference: string; original: AssetFile; media?:"media" };
if (process.send) {
  const deadline = setTimeout(() => process.exit(1), privateImageWorkLimits.deadlineMs);
  process.once("disconnect", () => process.exit(1));
  process.once("message", async (input: ImageWorkerInput) => {
  try {
    const store = await openPrivateAssetStore(input.directory);
    if (store.id !== input.store) throw new Error("ASSET_STORE_MISMATCH");
    const metadata = await (input.media==="media"?optimizeMediaBytes:optimizeImageBytes)(store, input.reference, input.original);
    process.send!({ metadata }, () => { clearTimeout(deadline); process.exit(0); });
  } catch (error) {
    const message = error instanceof Error && /^[A-Z][A-Z_]+$/.test(error.message) ? error.message : "ASSET_PROCESSING_FAILED";
    process.send!({ error: message }, () => { clearTimeout(deadline); process.exit(1); });
  }
  });
}
