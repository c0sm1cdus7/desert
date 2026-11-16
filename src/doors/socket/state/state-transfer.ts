// One immutable transfer can be shared by every connection of its identity, regardless of the view's total size.
import { serialize } from "node:v8";
import { readonlyState, stateResult } from "../../../journal/readonly-state.ts";
import { socketLimits } from "../wire/protocol.ts";
import { binaryFrame, serverFrame } from "../wire/frame.ts";
import { stateHash } from "./state-hash.ts";
import { statePatch } from "./state-patch.ts";
export function stateTransfer(
  given: { through: number },
  previous: { through: number } | undefined,
  now: number,
): readonly Buffer[] {
  const view = plain(given);
  const before = previous && plain(previous);
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
/** The part under a read-only view, or the value itself: the same object, never a copy. */
const raw = <T>(value: T): T => stateResult(readonlyState(value));
/** A view is a membrane spread one level over the house's parts: the wire carries those parts, never the membrane. */
const plain = <T extends object>(view: T): T => {
  const top = { ...raw(view) };
  for (const [key, part] of Object.entries(top)) Reflect.set(top, key, raw(part));
  return top;
};
