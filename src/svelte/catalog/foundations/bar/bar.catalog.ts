// Bar: the toolbar of a surface (DESIGN §3.2), built from the toolbar-layout composition: top commands with identity,
// leading navigation, measured trailing commands with overflow and the top primary; bottom commit or steps choices;
// the navigation pane's identity, toggle and settings placeholder; the place search field; and a surface's own controls.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { BarContract } from "./bar.contract.ts";

export const Bar = defineFoundation({
  id: "bar",
  purpose: { key: "bar.purpose" },
  messages: ["bar.purpose", "bar.backToTop", "bar.create", "bar.moreActions", "bar.hideNavigation", "bar.showNavigation", "bar.settings",
    "bar.settingsUnavailable", "bar.searchLabel", "bar.searchPlaceholder", "bar.closeSearch", "bar.search"],
  owner: { entry: "Bar.svelte", parts: ["BarIdentity.svelte", "BarSearch.svelte", "bar.css", "toolbar-commands.svelte.ts", "toolbar-leading.svelte.ts"],
    mechanisms: ["toolbar-geometry", "toolbar-scroll"] },
  shape: "none", states: ["default", "searching", "overflow", "controls"],
  variants: { purpose: ["commands", "commit", "steps", "navigation"] },
  stateVariants: { searching: { purpose: ["commands"] }, overflow: { purpose: ["commands"] }, controls: { purpose: ["commands"] } },
  approval: "required", contract: BarContract,
} as const);
