import type { RequestListener } from "node:http";
import { readFileSync } from "node:fs";
import { digest, hash } from "./files.ts";
import { bindLocalMedia, loadLocalMedia, localMediaFile, requireDistinctMedia, type LocalMediaBinding } from "./media.ts";
import { prepareRenditions, renditionWidths } from "./public-catalog/renditions.ts";
import { sendCatalogMedia } from "./public-catalog/media-response.ts";

/** Shares approved image delivery; no paths or arbitrary files are request-addressable. */
export async function localMediaHandler(directory: string, files: Readonly<Record<string, string>>,
  binding: LocalMediaBinding | undefined, render: RequestListener) {
  const declared = Object.hasOwn(files, localMediaFile);
  if (!declared && binding) throw new Error("UNDECLARED_LOCAL_MEDIA_BINDING");
  if (declared && !binding) throw new Error("LOCAL_MEDIA_BINDING_REQUIRED");
  if (!declared || !binding) return { handle: render, close() {} };
  const expected = loadLocalMedia(directory);
  const assets = bindLocalMedia(binding);
  const metadata = assets.map(({ file: _file, ...value }) => value);
  if (digest(metadata) !== digest(expected.assets)) throw new Error("LOCAL_MEDIA_MISMATCH");
  requireDistinctMedia(assets, files);
  const images = new Map(assets.map(asset => {
    const bytes = readFileSync(asset.file);
    if (hash(bytes) !== asset.digest) throw new Error("LOCAL_MEDIA_CHANGED");
    return [asset.id, { ...asset, bytes }] as const;
  }));
  const renditions = await prepareRenditions(assets);
  const handle: RequestListener = (request, response) => {
    let url: URL, path: string;
    try { url = new URL(request.url ?? "/", "http://127.0.0.1"); path = decodeURIComponent(url.pathname); }
    catch { response.writeHead(400); response.end(); return; }
    const asset = path.startsWith("/media/") ? images.get(path.slice(7)) : undefined;
    if (!asset) { render(request, response); return; }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
    }
    const widths = url.searchParams.getAll("w");
    if (widths.length > 1 || [...url.searchParams.keys()].some(key => key !== "w") ||
      (widths.length && !renditionWidths.map(String).includes(widths[0]!))) {
      response.writeHead(400); response.end(); return;
    }
    if (widths.length) {
      const rendition = renditions.get(`${asset.id}:${widths[0]}`);
      if (!rendition) { response.writeHead(404); response.end(); return; }
      sendCatalogMedia(request, response, rendition); return;
    }
    sendCatalogMedia(request, response, asset);
  };
  return { handle, close() { images.clear(); renditions.clear(); } };
}
