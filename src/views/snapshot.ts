import { jsonSnapshot } from "../json.ts";
import { ViewLimits } from "./schema.ts";

/** Bound untyped input before the shared recursive JSON normalizer sees it. */
export function viewSnapshot(value: unknown) {
  const pending: { value: unknown; depth: number; ancestors: ReadonlySet<object> }[] = [
    { value, depth: 1, ancestors: new Set() },
  ];
  let nodes = 0;
  while (pending.length) {
    const current = pending.pop()!;
    if (++nodes > ViewLimits.inputNodes) throw new Error("VIEW_INPUT_LIMIT_EXCEEDED");
    if (current.depth > ViewLimits.inputDepth) throw new Error("VIEW_INPUT_DEPTH_EXCEEDED");
    if (typeof current.value !== "object" || current.value === null) continue;
    if (current.ancestors.has(current.value)) throw new Error("INVALID_VIEW_JSON");
    const ancestors = new Set(current.ancestors).add(current.value);
    const descriptors = Object.getOwnPropertyDescriptors(current.value);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!("value" in descriptor)) throw new Error("INVALID_VIEW_JSON");
      if (Array.isArray(current.value) && key === "length") continue;
      pending.push({ value: descriptor.value, depth: current.depth + 1, ancestors });
      // Do not allocate an unbounded queue before the visited-node limit fires.
      if (nodes + pending.length > ViewLimits.inputNodes) throw new Error("VIEW_INPUT_LIMIT_EXCEEDED");
    }
  }
  try { return jsonSnapshot(value); }
  catch (cause) { throw new Error("INVALID_VIEW_JSON", { cause }); }
}
