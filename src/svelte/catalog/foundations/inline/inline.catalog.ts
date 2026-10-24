// Inline: pieces in a horizontal sequence with a gap from the spacing scale, wrapping, in a labelled scroll rail, or
// neither. Compositions lay a row of pieces out with it instead of writing their own flex box.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { InlineContract } from "./inline.contract.ts";

export const Inline = defineFoundation({
  id: "inline",
  purpose: "Lay pieces out in a horizontal sequence with a gap from the spacing scale: wrapping, in a labelled scroll rail, or neither.",
  owner: { entry: "Inline.svelte" },
  shape: "none", states: ["default"],
  variants: { overflow: ["wrap", "scroll", "none"], justify: ["start", "center", "end", "between"] },
  slots: { children: { accepts: ["action", "color-bullet", "column", "face", "icon", "seed-avatar", "text"] } },
  approval: "required", contract: InlineContract,
} as const);
