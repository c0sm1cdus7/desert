import { join } from "node:path";
import { existsSync } from "node:fs";
import type { compile } from "../compile.ts";
import { serveBuiltIdentitySurface, serveBuiltLocalSurface } from "../build/serve.ts";
import { openLocalController } from "./controller.ts";
import { startLocalPostgres } from "./postgres-host.ts";
import { developerIdentity, writePrivateJson } from "./developer-identity.ts";
import type { LocalMediaBinding } from "../build/media.ts";
import type { PrivateImageStorage } from "../assets/host.ts";
import { viewProgramActivities } from "../activities/presentation.ts";
import { productViewProgram } from "../modules/compiled-product.ts";

export type ControllerHostOptions = {
  application: ReturnType<typeof compile>;
  roles: readonly string[];
  surfaceId: string;
  directory: string;
  privateImages?: PrivateImageStorage;
};
export type HostedSurfaceOptions = ControllerHostOptions & {
  buildDirectory: string; port?: number; media?: LocalMediaBinding;
};

export async function openControllerHost(options: ControllerHostOptions) {
  if (Object.hasOwn(options, "viewProgram")) throw new Error("VIEW_PROGRAM_OVERRIDE_FORBIDDEN");
  options.application.surface(options.surfaceId);
  const activities = viewProgramActivities(options.application, productViewProgram(options.application), options.surfaceId);
  const initialize = !existsSync(join(options.directory, "postgres"));
  const postgres = startLocalPostgres(options.directory);
  let controller: Awaited<ReturnType<typeof openLocalController>> | undefined;
  let closing: Promise<void> | undefined;
  function close() {
    return closing ??= (async () => {
      try { await controller?.close(); } finally { postgres.stop(); }
    })();
  }
  try {
    controller = await openLocalController(options.application, { ...postgres.database, roles: options.roles,
      ...(activities ? { activities } : {}),
      ...(options.privateImages ? { privateImages: options.privateImages } : {}) });
    return Object.freeze({ application: options.application, controller, initialize, close });
  } catch (error) { await close(); throw error; }
}

export async function serveControllerHost(options: HostedSurfaceOptions, access: "identity" | "developer") {
  if (options.port !== undefined && (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535)) {
    throw new Error("INVALID_LOCAL_PORT");
  }
  const host = await openControllerHost(options);
  let server: Awaited<ReturnType<typeof serveBuiltIdentitySurface>> | undefined;
  let closing: Promise<void> | undefined;
  function close() {
    return closing ??= (async () => {
      try { await server?.close(); } finally { await host.close(); }
    })();
  }
  try {
    const shared = { buildDirectory: options.buildDirectory, port: options.port ?? 0,
      ...(options.media ? { media: options.media } : {}) };
    if (access === "identity") {
      server = await serveBuiltIdentitySurface({ ...shared, controller: host.controller, surface: options.surfaceId });
    } else {
      const identity = await developerIdentity(host.controller, options.directory, host.initialize);
      server = await serveBuiltLocalSurface({ ...shared, session: host.controller.connect(identity.token, options.surfaceId) });
    }
    const launchFile = join(options.directory, "web-launch.json");
    writePrivateJson(launchFile, { url: server.launchUrl });
    return Object.freeze({ origin: server.origin, launchFile, close });
  } catch (error) { await close(); throw error; }
}
