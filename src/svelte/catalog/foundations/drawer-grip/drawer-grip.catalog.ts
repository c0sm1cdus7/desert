// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DrawerGripContract } from "./drawer-grip.contract.ts";

export const DrawerGrip = defineFoundation({
  id: "drawer-grip",
  purpose: "Declared as found at the start of the migration: DrawerGrip.svelte.",
  owner: { entry: "DrawerGrip.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: DrawerGripContract,
} as const);
