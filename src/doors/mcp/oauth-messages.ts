// Bound OAuth bodies and centralize uncached protocol responses without reflecting untrusted input.
import { oauthTexts } from "../../texts/oauth.texts.ts";
import { mcpTexts } from "../../texts/mcp.texts.ts";
import { header, type McpRequest, type McpResponse } from "./mcp-access.ts";
export function oauthJson(status: number, value: unknown): McpResponse {
  return {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(value),
  };
}
export function oauthError(error: string, status = 400) {
  return oauthJson(status, {
    error,
    error_description: error === "invalid_client_metadata" ? oauthTexts.metadata : mcpTexts.params,
  });
}
export async function oauthBody(request: McpRequest, type: string): Promise<string | undefined> {
  if (header(request, "content-type")?.split(";")[0]?.trim().toLowerCase() !== type) return undefined;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for await (const chunk of request.body()) {
      size += chunk.byteLength;
      if (size > 32768) return undefined;
      chunks.push(chunk);
    }
    return new TextDecoder("utf8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    return undefined;
  }
}
export function singleParameters(params: URLSearchParams): boolean {
  return [...params.keys()].every(key => params.getAll(key).length === 1);
}
export function oauthRedirect(uri: string, state: string | null, values: Record<string, string>): McpResponse {
  const target = new URL(uri);
  for (const [name, value] of Object.entries(values)) target.searchParams.set(name, value);
  if (state !== null) target.searchParams.set("state", state);
  return {
    status: 302,
    headers: { Location: target.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    body: "",
  };
}
