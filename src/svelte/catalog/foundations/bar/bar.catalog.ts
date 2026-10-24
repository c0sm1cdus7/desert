// Bar: the toolbar of a surface (DESIGN §3.2), built from the toolbar-layout composition: top commands with identity,
// leading navigation, measured trailing commands with overflow and the top primary; bottom commit or steps choices;
// the navigation pane's identity, toggle and settings placeholder; and the place search field.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { BarContract } from "./bar.contract.ts";

export const Bar = defineFoundation({
  id: "bar",
  purpose: "Keep navigation and contextual commands in the surface toolbar; reveal its title and subtitle only after the content header scrolls away.",
  owner: { entry: "Bar.svelte", parts: ["BarIdentity.svelte", "BarSearch.svelte", "bar.css", "toolbar-commands.svelte.ts", "toolbar-leading.svelte.ts"],
    mechanisms: ["toolbar-geometry", "toolbar-scroll"] },
  shape: "none", states: ["default", "searching", "overflow"],
  variants: { purpose: ["commands", "commit", "steps", "navigation"] },
  stateVariants: { searching: { purpose: ["commands"] }, overflow: { purpose: ["commands"] } },
  approval: "required", contract: BarContract,
} as const);
