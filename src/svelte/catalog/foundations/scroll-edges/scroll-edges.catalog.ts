// ScrollEdges: the background-colored fades over a scroll viewport where its top or bottom toolbar overlaps content
// that can still scroll. Its contract stays a stub: `viewport` and `owner` are HTMLElements, which no contract types.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ScrollEdgesContract } from "./scroll-edges.contract.ts";

export const ScrollEdges = defineFoundation({
  id: "scroll-edges",
  purpose: "Fade the edges of a scroll viewport under its toolbars while there is content left to scroll there.",
  owner: { entry: "ScrollEdges.svelte", parts: ["scroll-edges.css", "scroll-edges.ts"], mechanisms: ["toolbar-geometry"] },
  shape: "none", states: ["default"], approval: "required", contract: ScrollEdgesContract,
} as const);
