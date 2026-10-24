// Toolbar: the command toolbar of a surface, drawn by the toolbar layout. Its contract stays a stub: `controls` is a
// ToolbarControls, a type that lives in src/svelte/infra (visual code), so no contract may reference it.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarContract } from "./toolbar.contract.ts";

export const Toolbar = defineComposition({
  id: "toolbar",
  purpose: "Show a surface's toolbar commands (title, navigation, actions) and invoke the intent of the one pressed.",
  owner: { entry: "Toolbar.svelte" },
  uses: ["toolbar-layout"], approval: "none", contract: ToolbarContract,
} as const);
