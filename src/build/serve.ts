import { pathToFileURL } from "node:url";
import { join } from "node:path";
import type { RequestListener } from "node:http";
import type { LocalSession } from "../local.ts";
import { serveLocalSurface } from "../web/server.ts";
import { snapshotBuild } from "./snapshot.ts";
import { requireBuildSession } from "./session.ts";
import { publicHandler } from "./public-handler.ts";

export async function serveBuiltLocalSurface(options: {
  buildDirectory: string, session: LocalSession, port?: number,
}) {
  const snapshot = snapshotBuild(options.buildDirectory);
  try {
    requireBuildSession(snapshot.manifest, options.session);
    const loaded = await import(pathToFileURL(join(snapshot.directory, "web/handler.js")).href);
    if (typeof loaded.handler !== "function") throw new Error("INVALID_WEB_HANDLER");
    const server = await serveLocalSurface(options.session, snapshot.manifest.contractDigest,
      publicHandler(snapshot.manifest, loaded.handler as RequestListener), options.port ?? 4271);
    return { origin: server.origin, launchUrl: server.launchUrl,
      async close() { try { await server.close(); } finally { snapshot.close(); } },
    };
  } catch (error) { snapshot.close(); throw error; }
}
