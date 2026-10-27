// CatalogWorkspace: a workspace mapped onto the shell (DESIGN §3.2): its navigation pane from data, the content bar with
// Back and the place's commands, the search bar and its results, the place heading over the body, the bottom commands,
// and the panel with the failure dialog. Pages opened inside a destination return focus by key.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogWorkspaceContract } from "./catalog-workspace.contract.ts";

export const CatalogWorkspace = defineComposition({
  id: "catalog-workspace",
  purpose: { key: "catalogWorkspace.purpose" },
  messages: ["catalogWorkspace.purpose", "catalogWorkspace.back", "catalogWorkspace.searchRegion"],
  owner: { entry: "CatalogWorkspace.svelte" },
  uses: ["bar", "catalog-search-results", "catalog-workspace-content", "failure-dialog", "panel", "place-heading", "shell", "toolbar"],
  approval: "required", contract: CatalogWorkspaceContract,
} as const);
