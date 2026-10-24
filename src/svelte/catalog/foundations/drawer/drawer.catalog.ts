// Drawer: the transitional adapter of the piece renamed to modal (design §1.6). It keeps the frame props the node
// renderer and view-panel pass today and draws them through Modal; lanes B and E move those callers to Modal itself.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DrawerContract } from "./drawer.contract.ts";

export const Drawer = defineFoundation({
  id: "drawer",
  purpose: "Open a temporary surface over its parent with content and top or bottom toolbars, never lateral child surfaces.",
  owner: { entry: "Drawer.svelte" },
  shape: "none", states: ["open", "locked"], renders: ["transient"], approval: "required", contract: DrawerContract,
} as const);
