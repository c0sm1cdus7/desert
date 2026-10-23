import type { LocalSession } from "../local.ts";
import { localBrowserAccess } from "./access.ts";
import { gatewayTransport } from "./gateway-transport.ts";

export function localWebGateway(session: LocalSession, digest: string) {
  const access = localBrowserAccess();
  return { invitation: access.invitation, ...gatewayTransport(digest, {
    initial: session,
    resolve: cookie => access.authenticated(cookie) ? { session } : undefined,
    async request({ operation, request, body }) {
      if (operation === "accessState" && request.method === "GET") return { status: 200, value: { kind: "developer" } };
      if (operation !== "connect" || request.method !== "POST") return undefined;
      const input = await body();
      const invitation = input && typeof input === "object" && "invitation" in input ? input.invitation : undefined;
      return { status: 200, value: { contractDigest: digest }, cookie: access.connect(invitation) };
    },
  }) };
}
