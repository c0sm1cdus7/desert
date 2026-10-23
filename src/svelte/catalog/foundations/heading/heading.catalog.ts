// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { HeadingContract } from "./heading.contract.ts";

export const Heading = defineFoundation({
  id: "heading",
  purpose: "Declared as found at the start of the migration: Heading.svelte.",
  owner: { entry: "Heading.svelte", parts: ["heading-content.ts"] },
  shape: "none", states: ["default"], approval: "required", contract: HeadingContract,
} as const);
