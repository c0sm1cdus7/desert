// Deliberately forge a VALID checksum so semantic-corruption checks still exercise replay comparisons.
import { createHash } from "node:crypto";
import { deserialize, serialize } from "node:v8";
export function unpackFixture(bytes: Uint8Array): Record<string, unknown> {
  const envelope: unknown = deserialize(bytes);
  if (
    typeof envelope !== "object" ||
    envelope === null ||
    !("payload" in envelope) ||
    !(envelope.payload instanceof Uint8Array)
  )
    throw new Error("Missing snapshot payload");
  const value: unknown = deserialize(envelope.payload);
  if (typeof value !== "object" || value === null) throw new Error("Missing snapshot record");
  return Object.fromEntries(Object.entries(value));
}
export function packFixture(value: unknown): Uint8Array {
  const payload = serialize(value);
  return serialize({ payload, checksum: createHash("sha256").update(payload).digest("hex") });
}
