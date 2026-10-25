// Grid: pieces in auto-fitted tracks of one recipe (tiles, collections, cards, covers, results) with a gap from the spacing scale.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { GridContract } from "./grid.contract.ts";

export const Grid = defineFoundation({
  id: "grid",
  purpose: "Lay pieces out in auto-fitted tracks of one recipe (tiles, collections, cards, covers, results) with a gap from the spacing scale.",
  owner: { entry: "Grid.svelte" },
  shape: "none", states: ["default"],
  variants: { tracks: ["tiles", "collections", "cards", "covers", "results"] },
  slots: { children: { accepts: ["card", "catalog-card", "image", "node-renderer", "text"] } },
  approval: "required", contract: GridContract,
} as const);
