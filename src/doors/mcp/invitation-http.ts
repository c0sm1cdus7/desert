// Redeem outside MCP with a bounded body, a uniform refusal and no cacheable credential responses.
import type { DoorAccess } from "../../runtime/door-access.ts";
import { doorTexts } from "../../texts/doors.texts.ts";
import { header, type McpRequest, type McpResponse } from "./mcp-access.ts";
export async function redeemHttp(access: DoorAccess, request: McpRequest): Promise<McpResponse> {
  let code = "";
  let proof: unknown;
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
    }
  } catch {
    /* Malformed input consumes the same bounded attempt budget. */
  }
  if (request.signal?.aborted) code = "";
  try {
    const result = access.attempt(code, proof);
    return {
      status: result.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(result.status === 429 ? { "Retry-After": "60" } : {}),
      },
      body: JSON.stringify(
        result.key ? { key: result.key } : { error: result.status === 429 ? doorTexts.limited : doorTexts.denied },
      ),
    };
  } catch {
    return { status: 503, headers: { "Cache-Control": "no-store" }, body: doorTexts.denied };
  }
}
