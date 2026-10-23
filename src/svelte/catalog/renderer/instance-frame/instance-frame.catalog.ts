// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InstanceFrameContract } from "./instance-frame.contract.ts";

export const InstanceFrame = defineComposition({
  id: "instance-frame",
  purpose: "Declared as found at the start of the migration: InstanceFrame.svelte.",
  owner: { entry: "InstanceFrame.svelte" },
  uses: [], approval: "none", contract: InstanceFrameContract,
} as const);
