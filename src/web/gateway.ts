import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocalSession } from "../local.ts";
import { localBrowserAccess } from "./access.ts";
import { dispatch } from "./dispatch.ts";

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

export function localWebGateway(session: LocalSession, digest: string) {
  const access = localBrowserAccess();
  const availability = session.watchAvailability();
  const exposedErrors = new Set(["INVALID_REQUEST", "REQUEST_TOO_LARGE", "UNKNOWN_OPERATION", "UNAUTHENTICATED",
    "BROWSER_SESSION_REQUIRED", "INSTALLATION_MISMATCH", "CONTRACT_MISMATCH", "PRECONDITION_FAILED", "VERSION_CONFLICT",
    "NOT_FOUND", "RUN_EXPIRED", "INVALID_INPUT", "CONFIRMATION_MISMATCH", "INTENT_CONFLICT", "INVALID_RUN_STATE",
    "JOURNEY_NOT_EXPOSED", "JOURNEY_NOT_INSTALLED"]);
  return {
    invitation: access.invitation,
    close: availability.dispose,
    async handle(request: IncomingMessage, response: ServerResponse, origin: string) {
      response.setHeader("Content-Type", "application/json");
      response.setHeader("Cache-Control", "no-store");
      function send(status: number, value: unknown) { response.writeHead(status); response.end(JSON.stringify(value)); }
      try {
        if (request.headers.host !== new URL(origin).host ||
          (request.headers["sec-fetch-site"] && !["same-origin", "none"].includes(String(request.headers["sec-fetch-site"])))) {
          return send(403, { error: "ORIGIN_REJECTED" });
        }
        if (request.method === "POST" && request.headers.origin !== origin) return send(403, { error: "ORIGIN_REJECTED" });
        const operation = new URL(request.url!, origin).pathname.slice("/api/".length);
        if (operation === "connect" && request.method === "POST") {
          const input = await readBody(request);
          response.setHeader("Set-Cookie", access.connect(input?.invitation));
          return send(200, { contractDigest: digest });
        }
        if (!access.authenticated(request.headers.cookie)) return send(401, { error: "BROWSER_SESSION_REQUIRED" });
        if (request.headers["x-desert-contract"] !== digest) return send(409, { error: "CONTRACT_MISMATCH" });
        if (operation === "availability" && request.method === "GET") return send(200, availability.evidence());
        if (request.method !== "POST") return send(405, { error: "METHOD_NOT_ALLOWED" });
        return send(200, await dispatch(session, operation, await readBody(request)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const code = message.startsWith("COMMIT_UNCERTAIN") ? "COMMIT_UNCERTAIN" :
          exposedErrors.has(message) ? message : "CONTROLLER_UNAVAILABLE";
        send(code === "CONTROLLER_UNAVAILABLE" ? 503 : 409, { error: code });
      }
    },
  };
}
