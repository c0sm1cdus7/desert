// Public envelopes redact credentials and explicitly correlate redacted identifiers by a stable digest.
import { meant } from "../../../fields/phrases.ts";
import { doorTexts } from "../../../texts/doors.texts.ts";
import { createHash } from "node:crypto";
import type { ServerMessage } from "../wire/protocol.ts";
export const requestDigest = (id: string) => createHash("sha256").update(`socket-request-id:${id}`).digest("hex");
export function publicMessage(message: ServerMessage, prepare: <T>(value: T) => T): ServerMessage {
  const clean = prepare(message);
  if (message.type === "result" && clean.type === "result") {
    const receipt = message.private === undefined ? undefined : meant(message.private);
    const code = receipt?.match(/^[^:]*: ([2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}) /)?.[1];
    if (code) return { ...clean, private: doorTexts.receipt(code), ...safeId(message, clean) };
  }
  return { ...clean, ...safeId(message, clean) };
}
function safeId(message: ServerMessage, clean: ServerMessage) {
  if ("id" in message && "id" in clean && clean.id !== message.id)
    return { id: requestDigest(message.id), correlation: "sha256" as const };
  return {};
}
