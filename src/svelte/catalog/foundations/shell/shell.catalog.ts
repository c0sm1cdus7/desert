// Shell: the workspace (DESIGN §3.2). It owns the document title, the wallpaper, the navigation sidebar (its pane drawn
// from data, its overlay and edge swipe), the main place with its bars and docking heading, the search overlay and its
// focus, the adaptive host panels dock into, and the viewport operations its callers drive through its instance.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ShellContract } from "./shell.contract.ts";

export const Shell = defineFoundation({
  id: "shell",
  purpose: "Host a workspace place with its navigation sidebar, toolbars, search overlay, panels and failure dialog.",
  owner: { entry: "Shell.svelte",
    parts: ["AdaptiveSurfaceLayout.svelte", "CatalogEdgeNavigation.svelte", "ShellBody.svelte", "ShellNavigation.svelte", "catalog-shell.css",
      "dock-above.ts", "navigation-icons.ts", "place-heading-motion.ts", "search-focus.svelte.ts", "toolbar-reading-boundary.ts"],
    vendor: ["sidebar", "tooltip"], mechanisms: ["surface-host", "swipe-motion", "toolbar-geometry"] },
  shape: "none", states: ["default", "searching"],
  slots: {
    top: { accepts: ["bar", "toolbar"] },
    content: { accepts: ["catalog-workspace-content", "place-heading"] },
    bottom: { accepts: ["bar", "toolbar"] },
    search: { accepts: ["catalog-search-results"] },
    panels: { accepts: ["failure-dialog", "panel"] },
  },
  approval: "required", contract: ShellContract,
} as const);
