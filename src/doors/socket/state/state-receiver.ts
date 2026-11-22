// A staged view is private until its sequence, identity and entire-state fingerprint all agree.
import { deserialize } from "node:v8";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { applyStatePatch, type StatePatch } from "./state-patch.ts";
import { stateHash } from "./state-hash.ts";
import type { ServerMessage } from "../wire/protocol.ts";
const patchSchema = Type.Recursive(self =>
  Type.Union([
    Type.Object({ kind: Type.Literal("put"), value: Type.Unknown() }),
    Type.Object({
      kind: Type.Literal("append"),
      from: Type.Integer({ minimum: 0 }),
      values: Type.Array(Type.Unknown()),
    }),
    Type.Object({
      kind: Type.Union([Type.Literal("object"), Type.Literal("map")]),
      changes: Type.Array(Type.Tuple([Type.String(), self])),
      remove: Type.Array(Type.String()),
    }),
  ]),
);
function isPatch(value: unknown): value is StatePatch {
  return Value.Check(patchSchema, value);
}
export function stateReceiver() {
  let header: Extract<ServerMessage, { type: "state" }> | undefined;
  let chunks: Buffer[] = [];
  let received = 0;
  const reset = () => {
    header = undefined;
    chunks = [];
    received = 0;
  };
  return {
    reset,
    begin: (message: Extract<ServerMessage, { type: "state" }>) => {
      if (header) throw new Error("Unfinished state");
      header = message;
    },
    accept: (bytes: Buffer, before: { through: number } | undefined): { value: unknown; hash: string } | undefined => {
      if (!header || bytes.length > header.bytes - received) throw new Error("Unexpected state chunk");
      chunks.push(bytes);
      received += bytes.length;
      if (received < header.bytes) return;
      const meta = header;
      const encoded = Buffer.concat(chunks, received);
      reset();
      if (meta.base !== null && meta.base !== before?.through) throw new Error("State base mismatch");
      const patch: unknown = deserialize(encoded);
      if (!isPatch(patch)) throw new Error("Invalid state patch");
      const value = applyStatePatch(meta.base === null ? undefined : before, patch);
      if (stateHash(value) !== meta.fingerprint) throw new Error("State fingerprint mismatch");
      return { value, hash: meta.fingerprint };
    },
  };
}
