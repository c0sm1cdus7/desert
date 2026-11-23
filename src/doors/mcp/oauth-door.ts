// Route OAuth discovery, stateless registration, invitation consent and PKCE exchange over the existing door.
import { meant } from "../../fields/phrases.ts";
import { oauthAuthorization, type OAuthContext } from "./oauth-authorization.ts";
import type { DoorAccess } from "../../runtime/door-access.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { oauthTexts as said } from "../../texts/oauth.texts.ts";
import type { OAuthCodeJournal } from "./oauth-code-journal.ts";
import { oauthCodes } from "./oauth-codes.ts";
import { clientMetadata, clientRegistrations } from "./oauth-registration.ts";
import { oauthBody, oauthError, oauthJson, singleParameters } from "./oauth-messages.ts";
import { oauthPage } from "./oauth-page.ts";
import { type McpRequest, type McpResponse } from "./mcp-access.ts";
export type OAuthOptions = Readonly<{ origin: string }>;
function publicOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    if (url.origin !== origin || url.protocol !== "https:") throw new Error();
    return origin;
  } catch {
    throw new Error(meant(said.configuration));
  }
}
export function oauthDoor(
  options: OAuthOptions,
  rootKey: Uint8Array,
  access: DoorAccess,
  now: () => number,
  revoke: (key: string) => void,
  journal: OAuthCodeJournal,
) {
  return new OAuthDoor(publicOrigin(options.origin), rootKey, access, now, revoke, journal);
}
class OAuthDoor {
  private readonly origin: string;
  private readonly context: OAuthContext;
  constructor(
    origin: string,
    rootKey: Uint8Array,
    access: DoorAccess,
    now: () => number,
    revoke: (key: string) => void,
    journal: OAuthCodeJournal,
  ) {
    this.origin = origin;
    this.context = {
      resource: `${origin}/mcp`,
      clients: clientRegistrations(rootKey, origin),
      codes: oauthCodes(now, revoke, journal),
      access,
      revoke,
    };
  }
  private discovery(path: string) {
    const origin = this.origin,
      resource = this.context.resource;
    const metadata = {
      resource,
      authorization_servers: [origin],
      scopes_supported: ["house"],
      bearer_methods_supported: ["header"],
    };
    const server = {
      issuer: origin,
      authorization_endpoint: `${origin}/authorize`,
      token_endpoint: `${origin}/token`,
      registration_endpoint: `${origin}/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["house"],
    };
    return path === "/.well-known/oauth-authorization-server" ? server : metadata;
  }
  private async register(request: McpRequest) {
    const { clients } = this.context;
    const body = await oauthBody(request, "application/json");
    let value: unknown;
    try {
      value = JSON.parse(body ?? "");
    } catch {
      return oauthError("invalid_client_metadata");
    }
    const client = clientMetadata(value);
    if (!client) return oauthError("invalid_client_metadata");
    return oauthJson(201, {
      client_id: clients.issue(client),
      ...client,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    });
  }
  private async token(request: McpRequest) {
    const { clients, codes, access } = this.context;
    const body = await oauthBody(request, "application/x-www-form-urlencoded");
    if (body === undefined) return oauthError("invalid_request");
    const params = new URLSearchParams(body);
    if (!singleParameters(params)) return oauthError("invalid_request");
    if (!params.get("grant_type")) return oauthError("invalid_request");
    if (params.get("grant_type") !== "authorization_code") return oauthError("unsupported_grant_type");
    if (!["code", "redirect_uri", "client_id", "code_verifier", "resource"].every(name => params.get(name)))
      return oauthError("invalid_request");
    if (!clients.read(params.get("client_id") ?? "")) return oauthError("invalid_client");
    const material = codes.exchange(params);
    if (!material || !access.get(material)) return oauthError("invalid_grant");
    return oauthJson(200, { access_token: material, token_type: "Bearer", scope: "house" });
  }
  close = () => this.context.codes.close();
  challenge(request: McpRequest) {
    const parameters = [`resource_metadata="${this.origin}/.well-known/oauth-protected-resource/mcp"`, 'scope="house"'];
    if (Object.keys(request.headers).some(name => name.toLowerCase() === "authorization"))
      parameters.push('error="invalid_token"');
    return ["Bearer", parameters.join(", ")].join(" ");
  }
  async handle(request: McpRequest): Promise<McpResponse | undefined> {
    const [path] = request.path.split("?");
    if (request.path.length > 32768) return oauthError("invalid_request");
    const discovery = [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
      "/.well-known/oauth-authorization-server",
    ];
    if (request.method === "GET" && discovery.includes(path ?? "")) return oauthJson(200, this.discovery(path ?? ""));
    if (request.method === "POST" && path === "/register") return this.register(request);
    if ((request.method === "GET" || request.method === "POST") && path === "/authorize") {
      try {
        return await oauthAuthorization(
          this.context,
          request,
          new URLSearchParams(request.path.split("?").slice(1).join("?")),
        );
      } catch {
        return oauthPage(503, doorTexts.denied);
      }
    }
    if (request.method === "POST" && path === "/token") return this.token(request);
    return undefined;
  }
}
