import type { AssetReference, AssetImageVariant } from "../../assets/types.ts";
import { TransportError } from "./transport.ts";

export type PrivateImageLease = Readonly<{
  signal: AbortSignal;
  read: (variant: AssetImageVariant, signal?: AbortSignal) => Promise<Blob>;
}>;
export type PrivateImages = Readonly<{
  lease: (asset: AssetReference) => PrivateImageLease | undefined;
  subscribe: (listener: () => void) => () => void;
}>;
export type PrivateImageContext = Readonly<{
  valid: () => boolean;
  read: (variant: AssetImageVariant, signal: AbortSignal) => Promise<Blob>;
}>;

/** A fetched image retains its scope lease until the rendered pixels are released. */
export function privateImageAccess(resolve: (asset: AssetReference) => PrivateImageContext | undefined) {
  const entries = new Map<string, { context: PrivateImageContext; controller: AbortController; lease: PrivateImageLease }>();
  const listeners = new Set<() => void>();
  let closed = false;
  function release(reference: string) {
    const entry = entries.get(reference);
    entries.delete(reference); entry?.controller.abort();
  }
  function lease(asset: AssetReference): PrivateImageLease | undefined {
    if (closed) return undefined;
    const previous = entries.get(asset.reference);
    if (previous?.context.valid()) return previous.lease;
    if (previous) release(asset.reference);
    const context = resolve(asset);
    if (!context?.valid()) return undefined;
    const controller = new AbortController();
    const current = Object.freeze({ signal: controller.signal,
      async read(variant: AssetImageVariant, signal?: AbortSignal) {
        const combined = AbortSignal.any([controller.signal, ...(signal ? [signal] : [])]);
        const valid = () => !closed && !combined.aborted && context.valid();
        if (!valid()) throw new TransportError("IMAGE_READ_EXPIRED");
        try {
          const blob = await context.read(variant, combined);
          if (!valid()) throw new TransportError("IMAGE_READ_EXPIRED");
          return blob;
        } catch (error) {
          if (!valid()) throw new TransportError("IMAGE_READ_EXPIRED");
          throw error;
        }
      },
    });
    entries.set(asset.reference, { context, controller, lease: current });
    return current;
  }
  function refresh() {
    for (const [reference, entry] of entries) if (!entry.context.valid()) release(reference);
    for (const listener of listeners) listener();
  }
  return Object.freeze({ lease, refresh,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    read(asset: AssetReference, variant: AssetImageVariant, signal?: AbortSignal): Promise<Blob> {
      const current = lease(asset);
      return current ? current.read(variant, signal) : Promise.reject(new TransportError("IMAGE_READ_UNAVAILABLE"));
    },
    close() {
      closed = true;
      for (const reference of entries.keys()) release(reference);
      for (const listener of listeners) listener();
      listeners.clear();
    },
  });
}
