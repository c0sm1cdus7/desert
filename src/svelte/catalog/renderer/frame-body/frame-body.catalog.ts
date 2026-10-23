// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FrameBodyContract } from "./frame-body.contract.ts";

export const FrameBody = defineComposition({
  id: "frame-body",
  purpose: "Declared as found at the start of the migration: FrameBody.svelte.",
  owner: { entry: "FrameBody.svelte" },
  uses: [], approval: "none", contract: FrameBodyContract,
} as const);
