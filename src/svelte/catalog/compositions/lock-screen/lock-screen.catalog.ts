// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LockScreenContract } from "./lock-screen.contract.ts";

export const LockScreen = defineComposition({
  id: "lock-screen",
  purpose: "Unlock the selected identity while its private content stays hidden.",
  owner: { entry: "LockScreen.svelte" },
  uses: ["field-well", "measured-field", "seed-avatar", "stack-layout", "text-input"], approval: "required", contract: LockScreenContract,
} as const);
