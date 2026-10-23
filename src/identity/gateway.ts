import type { LocalSession } from "../local.ts";
import { localBrowserAccess } from "../web/access.ts";
import { gatewayTransport, type GatewayReply, type GatewayRequest } from "../web/gateway-transport.ts";
import type { HumanIdentityAccess } from "./access.ts";
import { SessionRequests, accessInput, type AccessMethod } from "./contract.ts";
import { clearBootstrapCookie, clearIdentityCookie, cookieCredential, identityCookie } from "./cookie.ts";
import { readyAccessState } from "./sessions.ts";

export function identityWebGateway(access: HumanIdentityAccess, connect: (token: string) => LocalSession, digest: string) {
  const bootstrap = localBrowserAccess("desert-bootstrap"), sessions = new Map<string, LocalSession>();
  async function requireBoundSession(cookie: string | undefined, expected: string | string[] | undefined) {
    const token = cookieCredential(cookie);
    const state = token ? await access.state(token) : undefined;
    if (!token || state?.kind !== "ready") throw new Error("UNAUTHENTICATED");
    if (expected === undefined) throw new Error("BROWSER_SESSION_BINDING_REQUIRED");
    if (expected !== state.sessionBinding) throw new Error("BROWSER_SESSION_CHANGED");
    return { token, sessionBinding: state.sessionBinding };
  }
  async function resolve(cookie: string | undefined, expected: string | string[] | undefined) {
    const { token, sessionBinding } = await requireBoundSession(cookie, expected);
    if (!sessions.has(token)) {
      if (sessions.size >= 64) sessions.delete(sessions.keys().next().value!);
      sessions.set(token, connect(token));
    }
    return { session: sessions.get(token)!, sessionBinding };
  }
  async function request({ operation, request, body, digest }: GatewayRequest): Promise<GatewayReply | undefined> {
    const token = cookieCredential(request.headers.cookie);
    if (operation === "accessState" && request.method === "GET") return { status: 200, value: await access.state(token) };
    if (operation === "connect" && request.method === "POST") {
      const input = await body();
      if (!input || typeof input !== "object" || Object.keys(input).join() !== "invitation" || !("invitation" in input)) {
        throw new Error("INVALID_ACCESS_REQUEST");
      }
      const state = await access.state(token);
      return { status: 200, value: { contractDigest: digest, state },
        ...(state.kind === "onboarding" ? { cookie: bootstrap.connect(input.invitation) } : {}) };
    }
    if (!Object.hasOwn(SessionRequests, operation)) return undefined;
    if (request.headers["x-desert-contract"] !== digest) throw new Error("CONTRACT_MISMATCH");
    if (request.method !== "POST") return { status: 405, value: { error: "METHOD_NOT_ALLOWED" } };
    const input = accessInput(operation as AccessMethod, await body());
    switch (operation) {
      case "initialize": {
        if (!bootstrap.authenticated(request.headers.cookie)) throw new Error("BOOTSTRAP_REQUIRED");
        const credential = await access.initialize(accessInput("initialize", input));
        bootstrap.invalidate();
        return { status: 200, value: readyAccessState(credential.identity, credential.token),
          cookie: [identityCookie(credential.token), clearBootstrapCookie] };
      }
      case "signIn": {
        const credential = await access.signIn(accessInput("signIn", input));
        return { status: 200, value: readyAccessState(credential.identity, credential.token), cookie: identityCookie(credential.token) };
      }
      case "lock": {
        const bound = await requireBoundSession(request.headers.cookie, request.headers["x-desert-session"]);
        await access.lock(bound.token); sessions.delete(bound.token);
        return { status: 200, value: { kind: "locked" }, cookie: clearIdentityCookie, sessionBinding: bound.sessionBinding };
      }
    }
    throw new Error("UNKNOWN_OPERATION");
  }
  const transport = gatewayTransport(digest, { resolve, request });
  return { invitation: bootstrap.invitation, handle: transport.handle,
    close() { transport.close(); sessions.clear(); bootstrap.invalidate(); } };
}
