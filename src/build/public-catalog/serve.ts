import { createServer, type RequestListener } from "node:http";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { hash, digest } from "../files.ts";
import { publicHandler } from "../public-handler.ts";
import { loadPublicCatalogBuild } from "./manifest.ts";
import { bindCatalogAssets, type CatalogAssetBinding } from "./assets.ts";
import { sendCatalogMedia } from './media-response.ts';
import { prepareRenditions, renditionWidths } from './renditions.ts';

/** Private benchmark host. Images remain external local bindings, never exported in the build. */
export async function servePublicCatalog(options: {
  buildDirectory: string; sourceRoot: string; assets: readonly CatalogAssetBinding[]; port?: number;
}) {
  const original = loadPublicCatalogBuild(options.buildDirectory);
  const directory = mkdtempSync(join(tmpdir(), "desert-public-catalog-"));
  try {
    cpSync(options.buildDirectory, directory, { recursive: true });
    const manifest = loadPublicCatalogBuild(directory);
    if (digest(original) !== digest(manifest)) throw new Error("BUILD_CHANGED_DURING_SNAPSHOT");
    const media = bindCatalogAssets(options.sourceRoot, options.assets);
    if (digest(media.map(({ file: _file, ...value }) => value)) !== digest(manifest.assets)) {
      throw new Error("CATALOG_MEDIA_MISMATCH");
    }
    const images = new Map(media.map(asset => {
      const bytes = readFileSync(asset.file);
      if (hash(bytes) !== asset.digest) throw new Error("CATALOG_MEDIA_CHANGED");
      return [asset.id, { ...asset, bytes }] as const;
    }));
    const renditions = await prepareRenditions(media);
    const loaded = await import(pathToFileURL(join(directory, "web/handler.js")).href);
    if (typeof loaded.handler !== "function") throw new Error("INVALID_WEB_HANDLER");
    const render = publicHandler(manifest, loaded.handler as RequestListener);
    const server = createServer((request, response) => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { Allow: "GET, HEAD" }); response.end(); return;
      }
      let path: string;
      try { path = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname); }
      catch { response.writeHead(400); response.end(); return; }
      if (path.startsWith("/media/")) {
        const asset = images.get(path.slice(7));
        if (!asset) { response.writeHead(404); response.end(); return; }
        const width = new URL(request.url!, 'http://127.0.0.1').searchParams.get('w');
        if (width !== null) {
          if (!(renditionWidths as readonly number[]).includes(Number(width))) {
            response.writeHead(400); response.end(); return;
          }
          const variant = renditions.get(`${asset.id}:${Number(width)}`);
          if (!variant) { response.writeHead(404); response.end(); return; }
          sendCatalogMedia(request, response, variant); return;
        }
        sendCatalogMedia(request, response, asset); return;
      }
      render(request, response);
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject); server.listen(options.port ?? 0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("CATALOG_ADDRESS_REQUIRED");
    return { origin: `http://127.0.0.1:${address.port}`,
      async close() {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        images.clear(); renditions.clear(); rmSync(directory, { recursive: true });
      },
    };
  } catch (error) { rmSync(directory, { recursive: true }); throw error; }
}
