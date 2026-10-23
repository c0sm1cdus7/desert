// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessScreenContract } from "./access-screen.contract.ts";

export const AccessScreen = defineComposition({
  id: "access-screen",
  purpose: "Declared as found at the start of the migration: AccessScreen.svelte.",
  owner: { entry: "AccessScreen.svelte" },
  uses: ["access-experience"], approval: "none", contract: AccessScreenContract,
} as const);
