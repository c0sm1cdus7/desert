// Reads only a bounded prefix of the rejection and cleans its data before keeping it.
import { meant } from "../../fields/phrases.ts";
import type { ProviderRejection } from "../../fields/provider-rejection.ts";
import { isRecord } from "../../fields/json-values.ts";
import { modelTexts } from "../../texts/model.texts.ts";
import { mcpTexts } from "../../texts/mcp.texts.ts";
const bodyLimit = 8192;
async function errorBody(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return { text: "", limited: false };
  const bytes = new Uint8Array(bodyLimit);
  let length = 0;
  try {
    while (length < bodyLimit) {
      const next = await reader.read();
      if (next.done) break;
      const chunk: unknown = next.value;
      if (!(chunk instanceof Uint8Array)) throw new Error("response.body");
      const part = chunk.subarray(0, bodyLimit - length);
      bytes.set(part, length);
      length += part.length;
    }
  } catch {
    return { text: meant(modelTexts.errorBodyUnreadable), limited: false };
  } finally {
    // Cancelling may depend on the transport; it does not delay closing the turn.
    void reader.cancel().catch(() => {});
  }
  return { text: new TextDecoder().decode(bytes.subarray(0, length)), limited: length === bodyLimit };
}
function clean(text: string, key: string, scrub: (text: string) => string, limit: number, partial = false) {
  let safe: string;
  try {
    safe = scrub(text);
  } catch {
    return meant(mcpTexts.redacted);
  }
  if (key) {
    safe = safe.split(key).join(meant(mcpTexts.redacted));
    // The read limit may cut right inside the key used for the call.
    for (let length = partial ? Math.min(key.length - 1, safe.length) : 0; length > 0; length--)
      if (safe.endsWith(key.slice(0, length))) {
        safe = safe.slice(0, -length) + meant(mcpTexts.redacted);
        break;
      }
  }
  safe = safe
    .replace(/sk-ant-[\w-]*/gi, meant(mcpTexts.redacted))
    .replace(/[\p{Cc}\p{Cf}\s]+/gu, " ")
    .trim();
  return safe.length > limit ? safe.slice(0, limit - 1) + "…" : safe;
}
export async function readProviderError(
  response: Response,
  key: string,
  scrub: (text: string) => string,
): Promise<ProviderRejection> {
  const { text: body, limited } = await errorBody(response);
  let partial = limited;
  let type = "untyped";
  let message = body || meant(modelTexts.errorBodyEmpty);
  try {
    const data: unknown = JSON.parse(body);
    partial = false;
    const error = isRecord(data) && isRecord(data.error) ? data.error : undefined;
    if (typeof error?.type === "string" && error.type.trim()) type = error.type;
    message =
      typeof error?.message === "string" && error.message.trim() ? error.message : meant(modelTexts.errorBodyEmpty);
  } catch {
    // A proxy may answer with text or HTML instead of the provider's JSON envelope.
  }
  return {
    status: response.status,
    type: clean(type, key, scrub, 96),
    message: clean(message, key, scrub, 512, partial),
  };
}
