// Redeem outside MCP with a bounded body, a uniform refusal and no cacheable credential responses.
import { meant } from "../../fields/phrases.ts";
import type { DoorAccess } from "../../runtime/door-access.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { header, type McpRequest, type McpResponse } from "./mcp-access.ts";
export async function redeemHttp(access: DoorAccess, request: McpRequest): Promise<McpResponse> {
  const { code, proof, challenge, material } = await readAttempt(request);

  try {
    const result = await access.attempt(request.signal?.aborted ? "" : code, proof, challenge, material);
    return {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(result.status === 429 ? { "Retry-After": "60" } : {}),
      },
      body: JSON.stringify(responseBody(result)),
    };
  } catch {
    return { status: 503, headers: { "Cache-Control": "no-store" }, body: meant(doorTexts.denied) };
  }
}

function responseBody(result: Awaited<ReturnType<DoorAccess["attempt"]>>) {
  if (result.challenge !== undefined) return { challenge: result.challenge };
  if (result.key) return { key: result.key };
  return { error: result.status === 429 ? meant(doorTexts.limited) : meant(doorTexts.denied) };
}
async function readAttempt(request: McpRequest) {
  let code = "",
    challenge = "";
  let proof: unknown, material: string | undefined;
  try {
    if (header(request, "content-type")?.split(";")[0]?.trim() !== "application/json") throw new Error("content-type");
    let size = 0;
    const chunks: Uint8Array[] = [];
    for await (const chunk of request.body()) {
      size += chunk.byteLength;
      if (size > 1024) throw new Error("body-limit");
      chunks.push(chunk);
    }
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks)));
    if (value && typeof value === "object" && "code" in value && typeof value.code === "string") {
      code = value.code;
      proof = "proof" in value ? value.proof : undefined;
      if ("challenge" in value && typeof value.challenge === "string") challenge = value.challenge;
      if ("key" in value && typeof value.key === "string") material = value.key;
    }
  } catch {
    /* Malformed input consumes the same bounded attempt budget. */
  }
  return { code, proof, challenge, material };
}
