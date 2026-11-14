// One immutable transfer can be shared by every connection of its identity, regardless of the view's total size.
import { serialize } from "node:v8";
import { socketLimits } from "../../catalogs/levers.ts";
import { binaryFrame, serverFrame } from "./frame.ts";
import { stateHash } from "./state-hash.ts";
import { statePatch } from "./state-patch.ts";
export function stateTransfer(
  view: { through: number },
  before: { through: number } | undefined,
  now: number,
): readonly Buffer[] {
  const bytes = serialize(before ? statePatch(before, view) : { kind: "put", value: view });
  const frames = [
    serverFrame({
      tipo: "estado",
      seq: view.through,
      ahora: now,
      base: before?.through ?? null,
      huella: stateHash(view),
      bytes: bytes.length,
    }),
  ];
  for (let offset = 0; offset < bytes.length; offset += socketLimits.chunk)
    frames.push(binaryFrame(bytes.subarray(offset, offset + socketLimits.chunk)));
  return frames;
}
