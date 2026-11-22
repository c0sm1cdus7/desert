// The key is compared whole, and the body is consumed chunk by chunk only after it is authorized.
import { createHash, timingSafeEqual } from "node:crypto";
import type { DoorKey } from "../socket/peers/socket-peer.ts";
import { socketLimits } from "../socket/wire/protocol.ts";
export type McpRequest = Readonly<{
  method: string;
  path: string;
  headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  body: () => AsyncIterable<Uint8Array> | Iterable<Uint8Array>;
  signal?: AbortSignal;
}>;
export type McpResponse = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  body: string;
  events?: AsyncIterable<string>;
}>;
export const empty = (status: number, headers: Record<string, string> = {}): McpResponse => ({
  status,
  headers,
  body: "",
});
export function header(request: McpRequest, name: string): string | undefined {
  const found = Object.entries(request.headers).filter(([key]) => key.toLowerCase() === name);
  const value = found[0]?.[1];
  return found.length === 1 && typeof value === "string" ? value : undefined;
}
export function authenticate(
  request: McpRequest,
  keys: ReadonlyMap<string, DoorKey> | Readonly<{ get: (material: string) => DoorKey | undefined }>,
): DoorKey | undefined {
  const authorization = header(request, "authorization");
  const bearer = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
  if (Symbol.iterator in keys) {
    const digest = createHash("sha256")
      .update(bearer ?? "")
      .digest();
    let found: DoorKey | undefined;
    for (const [token, key] of keys) {
      const matches = timingSafeEqual(digest, createHash("sha256").update(token).digest());
      if (matches && bearer !== undefined) found = key;
    }
    return found;
  }
  const key = bearer === undefined ? undefined : keys.get(bearer);
  return key;
}
export function bodyFailure(request: McpRequest): McpResponse | undefined {
  const length = header(request, "content-length");
  if (length !== undefined && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) return empty(413);
  if (length !== undefined && Number(length) > socketLimits.json) return empty(413);
  if (header(request, "content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return empty(415);
  return undefined;
}
export async function readBody(request: McpRequest): Promise<string | undefined> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of request.body()) {
    size += chunk.byteLength;
    if (size > socketLimits.json) return undefined;
    chunks.push(chunk);
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
}
