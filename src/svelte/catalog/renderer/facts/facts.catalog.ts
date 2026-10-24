// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FactsContract } from "./facts.contract.ts";

export const Facts = defineComposition({
  id: "facts",
  purpose: "Read a labeled value, including the difference between an empty value and an unknown value.",
  owner: { entry: "Facts.svelte" },
  uses: ["fact-group"], approval: "none", contract: FactsContract,
} as const);
