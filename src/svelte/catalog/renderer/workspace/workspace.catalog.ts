// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { WorkspaceContract } from "./workspace.contract.ts";

export const Workspace = defineComposition({
  id: "workspace",
  purpose: "Declared as found at the start of the migration: Workspace.svelte.",
  owner: { entry: "Workspace.svelte" },
  uses: [], approval: "none", contract: WorkspaceContract,
} as const);
