// ViewWorkspace: the workspace of a view program; it keeps visited views, search, albums and the panel state, and
// draws them through the catalog workspace.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewWorkspaceContract } from "./view-workspace.contract.ts";

export const ViewWorkspace = defineComposition({
  id: "view-workspace",
  purpose: { key: "viewWorkspace.purpose" },
  messages: ["viewWorkspace.purpose", "viewWorkspace.documentTitle", "viewWorkspace.searchDescription", "viewWorkspace.entry",
    "viewWorkspace.video", "viewWorkspace.audio", "viewWorkspace.image", "viewWorkspace.collection"],
  owner: { entry: "ViewWorkspace.svelte", parts: ["workspace-data.ts"] },
  uses: ["appearance-root", "catalog-workspace"], approval: "required", contract: ViewWorkspaceContract,
} as const);
