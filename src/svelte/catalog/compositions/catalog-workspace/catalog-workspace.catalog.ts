// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogWorkspaceContract } from "./catalog-workspace.contract.ts";

export const CatalogWorkspace = defineComposition({
  id: "catalog-workspace",
  purpose: "Host a catalog place with its navigation sidebar, toolbars, search overlay, panels and failure dialog.",
  owner: { entry: "CatalogWorkspace.svelte", parts: ["AdaptiveSurfaceLayout.svelte", "CatalogEdgeNavigation.svelte", "CatalogNavigationToggle.svelte", "CatalogToolbar.svelte", "place-heading-motion.ts"] },
  uses: ["catalog-navigation", "catalog-search-results", "catalog-workspace-content", "failure-dialog", "panel", "place", "place-heading", "toolbar", "toolbar-layout", "wallpaper"], approval: "required", contract: CatalogWorkspaceContract,
} as const);
