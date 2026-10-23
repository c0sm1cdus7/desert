// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FaceContract } from "./face.contract.ts";

export const Face = defineFoundation({
  id: "face",
  purpose: "Declared as found at the start of the migration: Face.svelte.",
  owner: { entry: "Face.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: FaceContract,
} as const);
