// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewWorkspaceContract } from "./view-workspace.contract.ts";

export const ViewWorkspace = defineComposition({
  id: "view-workspace",
  purpose: "Declared as found at the start of the migration: ViewWorkspace.svelte.",
  owner: { entry: "ViewWorkspace.svelte", parts: ["workspace-data.ts"] },
  uses: ["catalog-workspace"], approval: "required", contract: ViewWorkspaceContract,
} as const);
