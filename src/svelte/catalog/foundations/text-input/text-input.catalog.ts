// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { TextInputContract } from "./text-input.contract.ts";

export const TextInput = defineFoundation({
  id: "text-input",
  purpose: "Write a single line with a persistent label, field help and validation feedback.",
  owner: { entry: "TextInput.svelte", parts: ["editor-capacity.ts"], vendor: ["field", "input", "input-group", "label", "textarea"] },
  shape: "radius", states: ["default"], approval: "required", contract: TextInputContract,
} as const);
