// Icon: one glyph of the product's icon set (lucide), by name, with the few marks callers give it: decorative, placement
// inside a control, chevron, search lead, tone, text size, list lead. It is the only piece that imports the icon library.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { IconContract } from "./icon.contract.ts";

export const Icon = defineFoundation({
  id: "icon",
  purpose: "Draw one named glyph of the product's icon set, optionally toned, sized to the text or placed inside a control.",
  owner: { entry: "Icon.svelte" },
  shape: "none", states: ["default"],
  variants: { tone: ["success", "warning"] },
  approval: "required", contract: IconContract,
} as const);
