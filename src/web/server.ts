import { createServer, type RequestListener } from "node:http";
import type { LocalSession } from "../local.ts";
import { localWebGateway } from "./gateway.ts";
import { identityWebGateway } from "../identity/gateway.ts";
import { requireControllerBinding } from "../local/controller-binding.ts";
import type { LocalController } from "../local/controller.ts";

export async function serveLocalSurface(session: LocalSession, digest: string,
  render: RequestListener, port = 4271) {
  return serveGatewaySurface(localWebGateway(session, digest), render, port);
}
export async function serveIdentitySurface(controller: LocalController, surface: string, render: RequestListener, port = 4271) {
  const { application } = requireControllerBinding(controller);
  if (application.surface(surface).kind !== "human") throw new Error("HUMAN_SURFACE_REQUIRED");
  return serveGatewaySurface(identityWebGateway(controller.access, token => controller.connect(token, surface), application.digest), render, port);
}
async function serveGatewaySurface(gateway: Pick<ReturnType<typeof localWebGateway>, "handle" | "close" | "invitation">,
  render: RequestListener, port: number) {
  let origin = "";
  const server = createServer((request, response) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    if (request.headers.host !== new URL(origin).host) { response.writeHead(403); response.end(); return; }
    if (request.url?.startsWith("/api/")) void gateway.handle(request, response, origin);
    else render(request, response);
  });
  try {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", () => { server.removeListener("error", reject); resolve(); });
    });
  } catch (error) { gateway.close(); throw error; }
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("LOCAL_SERVER_ADDRESS_REQUIRED");
  origin = `http://127.0.0.1:${address.port}`;
  return { origin, launchUrl: `${origin}/#access=${gateway.invitation}`,
    async close() {
      gateway.close();
      server.closeIdleConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    },
  };
}
