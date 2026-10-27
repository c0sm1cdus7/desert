import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocalSession } from "../local/session.ts";
import { requireAssetReference, type AssetImageVariant } from "../assets/types.ts";
import { isMediaType, mediaKindOf, renditionWidths } from "../media/rendition-policy.ts";
import { privateImageTransferLimits } from "../assets/host.ts";

export async function privateImageRequest(session: LocalSession, request: IncomingMessage, response: ServerResponse, url: URL) {
  if (!url.pathname.startsWith("/api/private-images/")) return false;
  const reference = url.pathname.slice("/api/private-images/".length);
  requireAssetReference(reference);
  const runId = url.searchParams.get("runId");
  if (!runId) throw new Error("INVALID_REQUEST");
  requireAssetReference(runId);
  const abort = new AbortController();
  const cancel = () => abort.abort();
  request.once("aborted", cancel); response.once("close", cancel);
  try {
    if (request.method === "POST") {
      if (request.headers["content-type"] !== "application/octet-stream" || request.headers["content-encoding"] ||
        [...url.searchParams.keys()].sort().join(",") !== "inputField,runId") throw new Error("INVALID_REQUEST");
      const inputField = url.searchParams.get("inputField");
      if (!inputField || inputField.length > 256) throw new Error("INVALID_ASSET_INPUT");
      request.setTimeout(privateImageTransferLimits.idleMs, () => { cancel(); request.destroy(); });
      const value = await session.uploadImage(runId, inputField, reference, request, { signal: abort.signal });
      response.writeHead(200); response.end(JSON.stringify(value));
    } else if (request.method === "GET") {
      if ([...url.searchParams.keys()].sort().join(",") !== "runId,variant") throw new Error("INVALID_REQUEST");
      const requested = url.searchParams.get("variant")!;
      const variant = requested === "original" ? requested : renditionWidths.find(edge => String(edge) === requested);
      if (variant === undefined) throw new Error("INVALID_ASSET_VARIANT");
      const image = await session.image(runId, reference, variant as AssetImageVariant, { signal: abort.signal });
      response.setHeader("Content-Type", image.mediaType);
      response.setHeader("Content-Length", image.bytes.length);
      response.setHeader("X-Content-Type-Options", "nosniff");
      response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      // A document or an archive is saved, never displayed in the page's origin.
      if (isMediaType(image.mediaType) && ["document", "archive"].includes(mediaKindOf(image.mediaType))) {
        response.setHeader("Content-Disposition", "attachment");
      }
      response.writeHead(200); response.end(image.bytes);
    } else throw new Error("METHOD_NOT_ALLOWED");
    return true;
  } finally {
    request.setTimeout(0);
    request.off("aborted", cancel); response.off("close", cancel);
  }
}
