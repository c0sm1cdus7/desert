// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { OptionsControlContract } from "./options-control.contract.ts";

export const OptionsControl = defineComposition({
  id: "options-control",
  purpose: "Choose one or several values from a divided group of options.",
  owner: { entry: "OptionsControl.svelte" },
  uses: ["choice-list", "choice-row", "grouped-panel"], approval: "none", contract: OptionsControlContract,
} as const);
