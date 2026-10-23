import type { ApiMethods, Evidence } from "../types.ts";
import { Check } from "@sinclair/typebox/value";
import { AssetReferenceSchema, type AssetReference, type AssetImageVariant } from "../../assets/types.ts";
import {privateMediaTypes} from "../../assets/policy.ts";
import { schedulePrivateImageRead, waitForPrivateImageCapacity } from './private-image-queue.ts';

export class TransportError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export function acceptanceOutcomeUnknown(error: unknown): boolean {
  return !(error instanceof TransportError) || ["CONNECTION_LOST", "COMMIT_UNCERTAIN", "CONTROLLER_UNAVAILABLE",
    "INVALID_RESPONSE", "BROWSER_SESSION_CHANGED"].includes(error.code);
}

export type WebSessionBinding = { readonly kind: "developer" } | {
  readonly kind: "identity"; readonly sessionBinding: string;
  isCurrent(): boolean; invalidate(): void;
};

export function webTransport(digest: string, binding?: WebSessionBinding) {
  function requireCurrentSession() {
    if (!binding) throw new TransportError("BROWSER_SESSION_BINDING_REQUIRED");
    if (binding.kind === "identity" && !binding.isCurrent()) throw new TransportError("BROWSER_SESSION_CHANGED");
  }
  function headers(contentType?: string) {
    requireCurrentSession();
    return { ...(contentType ? { "Content-Type": contentType } : {}), "X-Desert-Contract": digest,
      ...(binding?.kind === "identity" ? { "X-Desert-Session": binding.sessionBinding } : {}) };
  }
  function requireBoundResponse(response: Response) {
    requireCurrentSession();
    if (binding?.kind === "identity") {
      if (response.status === 401) { binding.invalidate(); throw new TransportError("BROWSER_SESSION_CHANGED"); }
      if (response.headers.get("X-Desert-Session") !== binding.sessionBinding) {
        if (!response.ok) throw new TransportError("CONTROLLER_UNAVAILABLE");
        binding.invalidate(); throw new TransportError("BROWSER_SESSION_CHANGED");
      }
    }
  }
  async function request(path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
    try {
      const response = await fetch(`/api/${path}`, { method: body === undefined ? "GET" : "POST",
        headers: headers("application/json"),
        credentials: "same-origin", cache: "no-store", signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(path === "availability" ? 1200 : 20000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      requireBoundResponse(response);
      const result = await response.json();
      requireCurrentSession();
      if (!response.ok) throw new TransportError(typeof result.error === "string" ? result.error : "INVALID_RESPONSE");
      return result;
    } catch (error) {
      if (error instanceof TransportError) throw error;
      throw new TransportError("CONNECTION_LOST");
    }
  }
  return {
    async connect(invitation: string) {
      const result = await request("connect", { invitation }) as { contractDigest: string };
      if (result.contractDigest !== digest) throw new TransportError("CONTRACT_MISMATCH");
    },
    async evidence() { return await request("availability") as Evidence; },
    async call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"], options: { signal?: AbortSignal } = {}): Promise<ApiMethods[K]["output"]> {
      return await request(method, input, options.signal) as ApiMethods[K]["output"];
    },
    async stageImage(input: { runId: string; inputField: string; file: Blob }, options: { signal?: AbortSignal } = {}): Promise<AssetReference> {
      options.signal?.throwIfAborted();
      const reserved = await request("reserveImage", { runId: input.runId, inputField: input.inputField, size: input.file.size });
      if (!Check(AssetReferenceSchema, reserved)) throw new TransportError("INVALID_RESPONSE");
      const query = new URLSearchParams({ runId: input.runId, inputField: input.inputField });
      try {
        const response = await fetch(`/api/private-images/${reserved.reference}?${query}`, { method: "POST", body: input.file,
          headers: headers("application/octet-stream"), credentials: "same-origin", cache: "no-store",
          signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000) });
        requireBoundResponse(response);
        const result = await response.json();
        requireCurrentSession();
        if (!response.ok) throw new TransportError(typeof result.error === "string" ? result.error : "INVALID_RESPONSE");
        if (!Check(AssetReferenceSchema, result) || result.reference !== reserved.reference) throw new TransportError("INVALID_RESPONSE");
        return result;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        if (error instanceof TransportError) throw error;
        const status = await request("imageStatus", { runId: input.runId, inputField: input.inputField, reference: reserved.reference }) as ApiMethods["imageStatus"]["output"];
        if ((status.state === "ready" || status.state === "attached") && Check(AssetReferenceSchema, status.asset)
          && status.asset.reference === reserved.reference) return status.asset;
        throw new TransportError("IMAGE_UPLOAD_NOT_READY");
      }
    },
    async image(input: { runId: string; reference: string; variant: AssetImageVariant }, options: { signal?: AbortSignal } = {}): Promise<Blob> {
      const query = new URLSearchParams({ runId: input.runId, variant: String(input.variant) });
      const signal = AbortSignal.any([AbortSignal.timeout(20000), ...(options.signal ? [options.signal] : [])]);
      try {
        return await schedulePrivateImageRead(signal, async () => {
          for (let attempt = 0; ; attempt++) {
            signal.throwIfAborted();
            const response = await fetch(`/api/private-images/${encodeURIComponent(input.reference)}?${query}`, {
              headers: headers(), credentials: "same-origin", cache: "no-store", signal });
            requireBoundResponse(response);
            if (!response.ok) {
              const result = await response.json(); requireCurrentSession();
              if (result.error === 'ASSET_TRANSFER_BUSY' && attempt < 4) {
                await waitForPrivateImageCapacity(signal, 100 * 2 ** attempt); continue;
              }
              throw new TransportError(typeof result.error === "string" ? result.error : "INVALID_RESPONSE");
            }
            const blob = await response.blob();
            requireCurrentSession();
            if (!(input.variant==="original"?privateMediaTypes:["image/webp"]).includes(blob.type)) throw new TransportError("INVALID_RESPONSE");
            return blob;
          }
        });
      } catch (error) {
        if (options.signal?.aborted || error instanceof TransportError) throw error;
        if (error instanceof Error && error.message === 'ASSET_TRANSFER_BUSY') throw new TransportError('ASSET_TRANSFER_BUSY');
        throw new TransportError("CONNECTION_LOST");
      }
    },
  };
}
export type Transport = ReturnType<typeof webTransport>;
/** Trusted host port; connection provisioning stays in the host-specific adapter. */
export type ControllerTransport = Pick<Transport, "call" | "evidence"> & Partial<Pick<Transport, "stageImage" | "image">>;
