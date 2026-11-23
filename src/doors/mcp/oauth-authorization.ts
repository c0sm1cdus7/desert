// Validate redirect authority before errors can redirect, then redeem through the audited invitation budget.
import { meant } from "../../fields/phrases.ts";
import { randomBytes } from "node:crypto";
import type { DoorAccess } from "../../runtime/door-access.ts";
import { mcpTexts } from "../../texts/mcp.texts.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { type oauthCodes } from "./oauth-codes.ts";
import { registeredRedirect, type clientRegistrations } from "./oauth-registration.ts";
import { oauthBody, oauthRedirect, singleParameters } from "./oauth-messages.ts";
import { oauthPage } from "./oauth-page.ts";
import type { McpRequest } from "./mcp-access.ts";
export type OAuthContext = Readonly<{
  resource: string;
  clients: ReturnType<typeof clientRegistrations>;
  codes: ReturnType<typeof oauthCodes>;
  access: DoorAccess;
  revoke: (key: string) => void;
}>;
export async function oauthAuthorization(context: OAuthContext, request: McpRequest, query: URLSearchParams) {
  const { clients, resource } = context;
  const body = request.method === "POST" ? await oauthBody(request, "application/x-www-form-urlencoded") : "";
  if (body === undefined) return oauthPage(400, mcpTexts.params);
  const params = request.method === "POST" ? new URLSearchParams(body) : query;
  const clientId = params.get("client_id") ?? "",
    uri = params.get("redirect_uri") ?? "";
  const client = clients.read(clientId);
  if (!singleParameters(params) || !client || !registeredRedirect(client, uri)) return oauthPage(400, mcpTexts.params);
  const state = params.get("state");
  const failure = (error: string) => oauthRedirect(uri, state, { error, error_description: meant(mcpTexts.params) });
  if (params.get("response_type") !== "code") return failure("unsupported_response_type");
  if (
    params.get("resource") !== resource ||
    params.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43}$/.test(params.get("code_challenge") ?? "")
  )
    return failure("invalid_request");
  if (params.has("scope") && params.get("scope") !== "house") return failure("invalid_scope");
  if (request.method === "GET") return oauthPage(200, "", params, client.client_name);
  return redeemAuthorization(context, request, params, client.client_name);
}
async function redeemAuthorization(
  context: OAuthContext,
  request: McpRequest,
  params: URLSearchParams,
  clientName: string | undefined,
) {
  const { codes, access, resource, revoke } = context;
  if (!codes.available()) return oauthPage(503, doorTexts.denied);
  const material = randomBytes(32).toString("base64url");
  const proof = params.get("proof");
  const result = await access.attempt(
    request.signal?.aborted ? "" : (params.get("invitation") ?? ""),
    proof !== null && /^\d+$/.test(proof) ? Number(proof) : undefined,
    params.get("challenge") ?? "",
    material,
    true,
  );
  if (!result.key) {
    if (result.status === 428) return oauthPage(200, "", params, clientName, result.challenge ?? "");
    const page = oauthPage(result.status, result.status === 429 ? doorTexts.limited : doorTexts.denied);
    return result.status === 429 ? { ...page, headers: { ...page.headers, "Retry-After": "60" } } : page;
  }
  const key = access.get(result.key);
  if (!key?.id) return oauthPage(503, doorTexts.denied);
  if (request.signal?.aborted) {
    revoke(key.id);
    return oauthPage(400, doorTexts.denied);
  }
  const code = codes.issue({
    client: params.get("client_id") ?? "",
    redirect: params.get("redirect_uri") ?? "",
    challenge: params.get("code_challenge") ?? "",
    resource,
    identity: key.identity,
    key: result.key,
    keyId: key.id,
  });
  if (!code) return oauthPage(503, doorTexts.denied);
  return oauthRedirect(params.get("redirect_uri") ?? "", params.get("state"), { code });
}
