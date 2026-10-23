// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { IdentityContract } from "./identity.contract.ts";

export const Identity = defineComposition({
  id: "identity",
  purpose: "Declared as found at the start of the migration: Identity.svelte.",
  owner: { entry: "Identity.svelte" },
  uses: ["feedback", "information", "stack-layout"], approval: "none", contract: IdentityContract,
} as const);
