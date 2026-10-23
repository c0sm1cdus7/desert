import { serveControllerHost, type HostedSurfaceOptions } from "./controller-host.ts";

/** Starts a protected local product without creating an identity or bypassing first-admin setup. */
export function serveIdentityHost(options: HostedSurfaceOptions) {
  return serveControllerHost(options, "identity");
}
