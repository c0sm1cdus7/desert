// Popover: a nonmodal surface anchored to the action or field that opens it; pressing the trigger again closes it,
// Escape or an outside interaction dismisses it (unless locked) and focus returns to the trigger. An adaptive popover
// becomes a modal sheet when its anchor has no room for it.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { PopoverContract } from "./popover.contract.ts";

export const Popover = defineFoundation({
  id: "popover",
  purpose: "Open contextual content, a form, options or commands in a surface anchored to its trigger.",
  owner: {
    entry: "Popover.svelte",
    parts: ["PopoverSurface.svelte", "FieldTrigger.svelte", "anchored-tab-exit.ts", "picker-presentation.svelte.ts", "popover.css"],
    vendor: ["popover"], mechanisms: ["surface-focus", "surface-host"],
  },
  shape: "radius", states: ["closed", "open", "disabled", "locked"],
  variants: { content: ["information", "form", "list", "menu"] },
  // F1-merge: accepts gains "choice", "status", "loading", "list", "inline" and "tag" (lanes F1a, F1c, F1e). "action"
  // is the command beside each label of a menu (design §1.3 menu).
  slots: { children: { accepts: ["frame-body", "column", "form", "stack-layout", "text", "action"] } },
  approval: "required", contract: PopoverContract,
} as const);
