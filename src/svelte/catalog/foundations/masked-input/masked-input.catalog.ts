// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MaskedInputContract } from "./masked-input.contract.ts";

export const MaskedInput = defineFoundation({
  id: "masked-input",
  purpose: "Declared as found at the start of the migration: MaskedInput.svelte.",
  owner: { entry: "MaskedInput.svelte", parts: ["input-edit-history.ts"] },
  shape: "none", states: ["default"], approval: "required", contract: MaskedInputContract,
} as const);
