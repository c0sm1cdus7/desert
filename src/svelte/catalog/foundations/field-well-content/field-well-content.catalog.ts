// FieldWellContent: the persistent label of a field well above its editor or value; a real <label> when it names an editor.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FieldWellContentContract } from "./field-well-content.contract.ts";

export const FieldWellContent = defineFoundation({
  id: "field-well-content",
  purpose: "Keep a field's label persistently above its editor or value, as a label for the editor or as text inside a button.",
  owner: { entry: "FieldWellContent.svelte" },
  shape: "none", states: ["for-editor", "in-button"],
  slots: { children: { accepts: ["masked-input", "text-input", "reference-values", "icon"] } },
  approval: "required", contract: FieldWellContentContract,
} as const);
