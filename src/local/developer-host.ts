import { join } from "node:path";
import { existsSync } from "node:fs";
import type { compile } from "../compile.ts";
import { serveBuiltLocalSurface } from "../build/serve.ts";
import { openLocalController } from "./controller.ts";
import { startLocalPostgres } from "./postgres-host.ts";
import { developerIdentity, writePrivateJson } from "./developer-identity.ts";

export type DeveloperHostOptions = {
  application: ReturnType<typeof compile>;
  role: string;
  surfaceId: string;
  directory: string;
};

/** Trusted developer bootstrap, not production login, enrollment or recovery. */
export async function openDeveloperHost(options: DeveloperHostOptions) {
  options.application.surface(options.surfaceId);
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
    controller = await openLocalController(options.application, { ...postgres.database, role: options.role });
    const identity = await developerIdentity(controller, options.directory, initialize);
    const session = controller.connect(identity.token, options.surfaceId);
    return Object.freeze({ application: options.application, session, close });
  } catch (error) { await close(); throw error; }
}

/** Serves only loopback; the one-use launch invitation stays in a private file. */
export async function serveDeveloperSurface(options: DeveloperHostOptions & {
  buildDirectory: string;
  port?: number;
}) {
  if (options.port !== undefined && (!Number.isInteger(options.port) || options.port < 0 || options.port > 65535)) {
    throw new Error("INVALID_LOCAL_PORT");
  }
  const host = await openDeveloperHost(options);
  let server: Awaited<ReturnType<typeof serveBuiltLocalSurface>> | undefined;
  let closing: Promise<void> | undefined;
  function close() {
    return closing ??= (async () => {
      try { await server?.close(); } finally { await host.close(); }
    })();
  }
  try {
    server = await serveBuiltLocalSurface({ buildDirectory: options.buildDirectory, session: host.session, port: options.port ?? 0 });
    const launchFile = join(options.directory, "web-launch.json");
    writePrivateJson(launchFile, { url: server.launchUrl });
    return Object.freeze({ origin: server.origin, launchFile, close });
  } catch (error) { await close(); throw error; }
}
