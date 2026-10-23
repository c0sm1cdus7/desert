import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { RequestListener } from "node:http";
import type { LocalSession } from "../local.ts";
import { serveLocalSurface, serveIdentitySurface } from "../web/server.ts";
import { snapshotBuild } from "./snapshot.ts";
import { requireBuildSession, requireBuildController } from "./session.ts";
import { publicHandler } from "./public-handler.ts";
import { localMediaHandler } from "./media-handler.ts";
import type { LocalMediaBinding } from "./media.ts";
import type { LocalController } from "../local/controller.ts";
import type { loadVerifiedBuild } from "./manifest.ts";

type BuildOptions = { buildDirectory: string; port?: number; media?: LocalMediaBinding };

export async function serveBuiltLocalSurface(options: BuildOptions & { session: LocalSession }) {
  return serveBuiltSurface(options, manifest => requireBuildSession(manifest, options.session),
    (render, digest) => serveLocalSurface(options.session, digest, render, options.port ?? 4271));
}
export async function serveBuiltIdentitySurface(options: BuildOptions & { controller: LocalController; surface: string }) {
  return serveBuiltSurface(options, manifest => requireBuildController(manifest, options.controller, options.surface),
    render => serveIdentitySurface(options.controller, options.surface, render, options.port ?? 4271));
}
async function serveBuiltSurface(options: BuildOptions, verify: (manifest: ReturnType<typeof loadVerifiedBuild>) => unknown,
  serve: (render: RequestListener, digest: string) => ReturnType<typeof serveLocalSurface>) {
  const snapshot = snapshotBuild(options.buildDirectory);
  let media: Awaited<ReturnType<typeof localMediaHandler>> | undefined;
  try {
    verify(snapshot.manifest);
    const loaded = await import(pathToFileURL(join(snapshot.directory, "web/handler.js")).href);
    if (typeof loaded.handler !== "function") throw new Error("INVALID_WEB_HANDLER");
    media = await localMediaHandler(snapshot.directory, snapshot.manifest.files, options.media,
      publicHandler(snapshot.manifest, loaded.handler as RequestListener));
    const server = await serve(media.handle, snapshot.manifest.contractDigest);
    return { origin: server.origin, launchUrl: server.launchUrl,
      async close() { try { await server.close(); } finally { media?.close(); snapshot.close(); } },
    };
  } catch (error) { media?.close(); snapshot.close(); throw error; }
}
