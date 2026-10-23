import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocalSession } from "../local.ts";
import { dispatch } from "./dispatch.ts";
import { controllerErrorCode } from "./errors.ts";
import { privateImageRequest } from "./private-images.ts";

export type GatewayReply = { status: number; value: unknown; cookie?: string | string[]; sessionBinding?: string };
export type GatewayRequest = { operation: string; request: IncomingMessage; body(): Promise<unknown>; digest: string };
async function readBody(request: IncomingMessage) {
  if (request.headers["content-type"] !== "application/json") throw new Error("INVALID_REQUEST");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65536) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("INVALID_REQUEST"); }
}

export function gatewayTransport(digest: string, access: {
  resolve(cookie: string | undefined, expected: string | string[] | undefined):
    { session: LocalSession; sessionBinding?: string } | undefined | Promise<{ session: LocalSession; sessionBinding?: string } | undefined>;
  request(context: GatewayRequest): Promise<GatewayReply | undefined>;
  initial?: LocalSession;
}) {
  const availability = new Map<LocalSession, ReturnType<LocalSession["watchAvailability"]>>();
  function watcher(session: LocalSession) {
    if (!availability.has(session)) {
      if (availability.size >= 64) { const first = availability.keys().next().value!; availability.get(first)!.dispose(); availability.delete(first); }
      availability.set(session, session.watchAvailability());
    }
    return availability.get(session)!;
  }
  if (access.initial) watcher(access.initial);
  return {
    close() { for (const item of availability.values()) item.dispose(); availability.clear(); },
    async handle(request: IncomingMessage, response: ServerResponse, origin: string) {
      response.setHeader("Content-Type", "application/json"); response.setHeader("Cache-Control", "no-store");
      function send(status: number, value: unknown, cookie?: string | string[]) {
        if (cookie) response.setHeader("Set-Cookie", cookie);
        response.writeHead(status); response.end(JSON.stringify(value));
      }
      try {
        if (request.headers.host !== new URL(origin).host ||
          (request.headers["sec-fetch-site"] && !["same-origin", "none"].includes(String(request.headers["sec-fetch-site"])))) {
          return send(403, { error: "ORIGIN_REJECTED" });
        }
        if (request.method === "POST" && request.headers.origin !== origin) return send(403, { error: "ORIGIN_REJECTED" });
        const operation = new URL(request.url!, origin).pathname.slice("/api/".length);
        const reply = await access.request({ operation, request, digest, body: () => readBody(request) });
        if (reply) {
          if (reply.sessionBinding) response.setHeader("X-Desert-Session", reply.sessionBinding);
          return send(reply.status, reply.value, reply.cookie);
        }
        const resolved = await access.resolve(request.headers.cookie, request.headers["x-desert-session"]);
        const session = resolved?.session;
        if (!session) return send(401, { error: "BROWSER_SESSION_REQUIRED" });
        if (resolved.sessionBinding) response.setHeader("X-Desert-Session", resolved.sessionBinding);
        if (request.headers["x-desert-contract"] !== digest) return send(409, { error: "CONTRACT_MISMATCH" });
        if (await privateImageRequest(session, request, response, new URL(request.url!, origin))) return;
        if (operation === "availability" && request.method === "GET") return send(200, watcher(session).evidence());
        if (request.method !== "POST") return send(405, { error: "METHOD_NOT_ALLOWED" });
        return send(200, await dispatch(session, operation, await readBody(request)));
      } catch (error) {
        const code = controllerErrorCode(error);
        const denied = ["UNAUTHENTICATED", "INVALID_CREDENTIALS", "BROWSER_SESSION_REQUIRED", "BOOTSTRAP_REQUIRED",
          "BROWSER_SESSION_BINDING_REQUIRED", "BROWSER_SESSION_CHANGED"].includes(code);
        send(code === "CONTROLLER_UNAVAILABLE" ? 503 : denied ? 401 : 409, { error: code });
      }
    },
  };
}
