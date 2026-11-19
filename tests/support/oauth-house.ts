// Exercise OAuth with real house authorization, generated credentials and either direct or HTTP transport.
import { createHash, randomBytes } from "node:crypto";
import { doorHouse, invitationCode } from "./door-house.ts";
import { mcpDoor } from "../../src/doors/mcp/mcp-handler.ts";
import { serveMcp } from "../../src/doors/mcp/mcp-http.ts";
import { solveInvitationProof } from "../../src/runtime/invitation-proof.ts";
import { isRecord } from "../../src/fields/json-values.ts";
export const oauthOrigin = "https://house.example";
export function responseField(body: string, name: string): string {
  const value: unknown = JSON.parse(body);
  if (!isRecord(value) || typeof value[name] !== "string") throw new Error("Missing OAuth response field");
  return value[name];
}
export async function oauthHouse(http = false, home?: string, rootKey?: Buffer) {
  const fixture = new OAuthFixture(home, rootKey);
  if (http) await fixture.listen();
  return fixture;
}
class OAuthFixture {
  readonly h: ReturnType<typeof doorHouse>;
  readonly rootKey: Buffer;
  readonly options;
  door: ReturnType<typeof mcpDoor>;
  constructor(home?: string, rootKey: Buffer = randomBytes(32)) {
    this.h = doorHouse(undefined, home);
    this.rootKey = rootKey;
    this.options = {
      name: "Casa",
      version: "1",
      limits: { recentLines: 20 },
      rootKey: this.rootKey,
      oauth: { origin: oauthOrigin },
    };
    this.door = mcpDoor(this.h.house(), this.options);
  }
  private server: Awaited<ReturnType<typeof serveMcp>> | undefined;
  async listen() {
    try {
      this.server = await serveMcp(this.door, { host: "127.0.0.1", port: 0 });
    } catch (error) {
      await this.close();
      throw error;
    }
  }
  readonly send = async (method: string, path: string, body = "", headers: Record<string, string> = {}) => {
    if (!this.server) return this.door.handle({ method, path, headers, body: () => [Buffer.from(body)] });
    const address = this.server.address;
    if (!address || typeof address !== "object") throw new Error("Missing test address");
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers,
      redirect: "manual",
      ...(method === "POST" ? { body } : {}),
    });
    return { status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() };
  };
  readonly field = (headers: Readonly<Record<string, string>>, name: string) =>
    Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
  readonly form = (path: string, params: URLSearchParams) =>
    this.send("POST", path, params.toString(), {
      "content-type": "application/x-www-form-urlencoded",
      host: "forged.invalid",
    });
  readonly register = async (redirect = "https://client.example/callback", name = "Cliente de prueba") => {
    const response = await this.send(
      "POST",
      "/register",
      JSON.stringify({ redirect_uris: [redirect], client_name: name, token_endpoint_auth_method: "none" }),
      { "content-type": "application/json" },
    );
    return responseField(response.body, "client_id");
  };
  readonly params = async () => {
    const verifier = randomBytes(32).toString("base64url");
    const authorization = new URLSearchParams({
      client_id: await this.register(),
      response_type: "code",
      redirect_uri: "https://client.example/callback",
      resource: `${oauthOrigin}/mcp`,
      scope: "house",
      code_challenge_method: "S256",
      code_challenge: createHash("sha256").update(verifier).digest("base64url"),
      state: "vuelta + / ? & ñ",
    });
    return { authorization, verifier };
  };
  readonly invite = async () => invitationCode(await this.h.act("invite", { door: "agent" }, "identities/beto"));
  readonly consent = (authorization: URLSearchParams, invitation: string, proof = solveInvitationProof(invitation)) => {
    const params = new URLSearchParams(authorization);
    params.set("invitation", invitation);
    params.set("proof", String(proof));
    return this.form("/authorize", params);
  };
  readonly grant = async () => {
    const { authorization, verifier } = await this.params();
    const invitation = await this.invite();
    const response = await this.consent(authorization, invitation);
    const location = this.field(response.headers, "location");
    if (response.status !== 302 || !location) throw new Error("Missing consent redirect");
    const code = new URL(location).searchParams.get("code");
    if (!code) throw new Error("Missing authorization code");
    const token = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: authorization.get("client_id") ?? "",
      redirect_uri: authorization.get("redirect_uri") ?? "",
      resource: `${oauthOrigin}/mcp`,
      code_verifier: verifier,
      code,
    });
    const key = [...this.h.house().tools.state().house.doors.keys.values()].find(
      key => key.identity === "beto" && !key.revoked,
    );
    if (!key) throw new Error("Missing issued door key");
    return { authorization, verifier, invitation, code, token, key };
  };
  readonly read = (key: string) =>
    this.send(
      "POST",
      "/mcp",
      JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "read", arguments: {} } }),
      { "content-type": "application/json", authorization: `Bearer ${key}` },
    );
  async reopen(withoutDoorClose = false) {
    if (!withoutDoorClose) await this.door.close();
    this.h.reopen();
    this.door = mcpDoor(this.h.house(), this.options);
  }
  async close() {
    if (this.server) await this.server.close();
    else await this.door.close();
    this.h.close();
  }
}
