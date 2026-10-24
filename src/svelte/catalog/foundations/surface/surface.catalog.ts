// Surface (the rename of place): the scroll owner of a navigation pane, a content place or a frame, with its top bar,
// scrolling content, bottom bar and search overlay, focus revealed clear of the bars and the scroll edges drawn over
// it; or the page an access experience fills over its backdrop. It absorbs scroll-edges and SurfaceFrame's section
// and viewport.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SurfaceContract } from "./surface.contract.ts";

export const Surface = defineFoundation({
  id: "surface",
  purpose: "Arrange content and top or bottom toolbars, with lateral surfaces only at the root. Mounted surfaces keep their own content and toolbars.",
  owner: { entry: "Surface.svelte", parts: ["ScrollEdges.svelte", "place-focus.ts", "scroll-edges.css", "scroll-edges.ts", "surface.css"],
    mechanisms: ["toolbar-geometry", "toolbar-scroll"] },
  shape: "none", states: ["default", "searching"],
  variants: { role: ["main", "navigation", "frame", "page"] },
  stateVariants: { searching: { role: ["main"] } },
  slots: {
    top: { accepts: ["bar", "heading", "toolbar"] },
    content: { accepts: ["catalog-workspace-content", "column", "content-flow", "frame-body", "icon", "place-heading"] },
    bottom: { accepts: ["bar", "toolbar"] },
    overlay: { accepts: ["catalog-search-results"] },
  },
  approval: "required", contract: SurfaceContract,
} as const);
