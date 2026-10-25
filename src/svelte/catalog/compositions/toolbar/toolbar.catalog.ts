// Toolbar: the command toolbar of a surface, drawn by the bar foundation from the surface's top or bottom toolbar.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarContract } from "./toolbar.contract.ts";

export const Toolbar = defineComposition({
  id: "toolbar",
  purpose: { key: "toolbar.purpose" },
  messages: ["toolbar.purpose"],
  owner: { entry: "Toolbar.svelte" },
  uses: ["bar"], approval: "none", contract: ToolbarContract,
} as const);
