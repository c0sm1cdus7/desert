// ViewWorkspace: the workspace of a view program; it keeps visited views, search, albums and the panel state, and
// draws them through the catalog workspace.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewWorkspaceContract } from "./view-workspace.contract.ts";

export const ViewWorkspace = defineComposition({
  id: "view-workspace",
  purpose: "Present a view program as a workspace with navigation, search, retained views and its panel.",
  owner: { entry: "ViewWorkspace.svelte", parts: ["workspace-data.ts"] },
  uses: ["catalog-workspace"], approval: "required", contract: ViewWorkspaceContract,
} as const);
