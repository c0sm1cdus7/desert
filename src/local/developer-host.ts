import { developerIdentity } from "./developer-identity.ts";
import { openControllerHost, serveControllerHost, type ControllerHostOptions, type HostedSurfaceOptions } from "./controller-host.ts";

export type DeveloperHostOptions = ControllerHostOptions;

/** Trusted developer bootstrap, not production login, enrollment or recovery. */
export async function openDeveloperHost(options: DeveloperHostOptions) {
  const host = await openControllerHost(options);
  try {
    const identity = await developerIdentity(host.controller, options.directory, host.initialize);
    const session = host.controller.connect(identity.token, options.surfaceId);
    return Object.freeze({ application: host.application, session, close: host.close });
  } catch (error) { await host.close(); throw error; }
}

/** Serves only loopback; the one-use launch invitation stays in a private file. */
export function serveDeveloperSurface(options: HostedSurfaceOptions) {
  return serveControllerHost(options, "developer");
}
