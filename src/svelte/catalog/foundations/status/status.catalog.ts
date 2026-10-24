// Status: why there is nothing to show (an empty collection, an offline controller, a note), as a centred block or a
// compact caption beside its glyph. It owns the vendor empty family.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { StatusContract } from "./status.contract.ts";

export const Status = defineFoundation({
  id: "status",
  purpose: "Say why there is nothing to show (empty, offline, a note) and what to do next, as a block or a compact caption.",
  owner: { entry: "Status.svelte", vendor: ["empty"] },
  shape: "radius", states: ["default"],
  variants: { tone: ["neutral", "offline", "note"], size: ["regular", "compact"] },
  approval: "required", contract: StatusContract,
} as const);
