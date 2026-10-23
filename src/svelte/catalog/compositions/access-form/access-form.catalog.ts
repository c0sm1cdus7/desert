// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessFormContract } from "./access-form.contract.ts";

export const AccessForm = defineComposition({
  id: "access-form",
  purpose: "Declared as found at the start of the migration: AccessForm.svelte.",
  owner: { entry: "AccessForm.svelte" },
  uses: ["appearance-preferences", "avatar-shuffle", "feedback", "stack-layout", "text-input"], approval: "required", contract: AccessFormContract,
} as const);
