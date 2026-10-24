// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaceContentContract } from "./place-content.contract.ts";

export const PlaceContent = defineComposition({
  id: "place-content",
  purpose: "Show a place's checked content: its header and each of its stacks.",
  owner: { entry: "PlaceContent.svelte" },
  uses: ["place-header", "stack"], approval: "none", contract: PlaceContentContract,
} as const);
