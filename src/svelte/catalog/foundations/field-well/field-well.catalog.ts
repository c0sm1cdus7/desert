// FieldWell: the rounded well of a single field: floating label, editor, optional prefix, accessory and footer.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FieldWellContract } from "./field-well.contract.ts";

export const FieldWell = defineFoundation({
  id: "field-well",
  purpose: "Frame one editor in a rounded well whose label floats when empty and settles above the value when filled or focused.",
  owner: { entry: "FieldWell.svelte", parts: ["field-well.css"] },
  shape: "radius", states: ["empty", "filled"],
  variants: { presentation: ["standard", "access"] },
  slots: { children: { accepts: ["masked-input", "text-input"] }, prefix: { accepts: ["selection-field"] },
    accessory: { accepts: ["clear-input", "action"] }, footer: { accepts: ["character-counter"] } },
  approval: "required", contract: FieldWellContract,
} as const);
