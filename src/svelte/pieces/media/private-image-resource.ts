import type { AssetReference, AssetImageVariant } from "../../../assets/types.ts";
import type { PrivateImages, PrivateImageLease } from "../../../web/client/private-images.ts";

type BlobURLs = { create: (blob: Blob) => string; revoke: (url: string) => void };

export function privateImageResource(images: PrivateImages | undefined, changed: () => void,
  urls: BlobURLs = { create: blob => URL.createObjectURL(blob), revoke: url => URL.revokeObjectURL(url) }) {
  let reference: string | undefined, url: string | undefined, failed = false;
  let generation = 0, revision = 0, request: AbortController | undefined;
  let selection: { asset: AssetReference; variant: AssetImageVariant } | undefined;
  let lease: PrivateImageLease | undefined, disposed = false;
  function release() { if (url) urls.revoke(url); url = undefined; }
  function invalidate() {
    generation++; request?.abort(); request = undefined;
    lease?.signal.removeEventListener("abort", invalidate); lease = undefined;
    release(); failed = false; changed();
  }
  function clear() {
    selection = undefined; invalidate();
    release(); reference = undefined; failed = false; changed();
  }
  async function load(asset: AssetReference, variant: AssetImageVariant): Promise<void> {
    if (disposed) return;
    selection = { asset, variant };
    const nextLease = images?.lease(asset);
    if (lease !== nextLease || reference !== asset.reference) {
      invalidate(); lease = nextLease; revision++;
      lease?.signal.addEventListener("abort", invalidate, { once: true });
    }
    reference = asset.reference; failed = false;
    if (!lease) { changed(); return; }
    const currentLease = lease;
    request?.abort(); const current = ++generation;
    const controller = new AbortController(); request = controller;
    changed();
    try {
      const blob = await currentLease.read(variant, controller.signal);
      if (current !== generation || controller.signal.aborted || currentLease.signal.aborted) return;
      const next = urls.create(blob); release(); url = next; changed();
    } catch {
      if (current !== generation || controller.signal.aborted || currentLease.signal.aborted) return;
      release(); failed = true; changed();
    }
  }
  const unsubscribe = images?.subscribe(() => {
    if (selection && images.lease(selection.asset) !== lease) void load(selection.asset, selection.variant);
  });
  return { load, clear, dispose() { disposed = true; unsubscribe?.(); clear(); },
    get reference() { return reference; }, get url() { return url; }, get failed() { return failed; },
    get revision() { return revision; } };
}
