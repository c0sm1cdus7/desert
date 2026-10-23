// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ObjectStateControlContract } from "./object-state-control.contract.ts";

export const ObjectStateControl = defineComposition({
  id: "object-state-control",
  purpose: "Choose an object state through a contextual command; a retained selection is not a required form input.",
  owner: { entry: "ObjectStateControl.svelte" },
  uses: ["object-state-row"], approval: "none", contract: ObjectStateControlContract,
} as const);
