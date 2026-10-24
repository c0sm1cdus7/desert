// ToolbarLayout: the top or bottom toolbar of a surface: leading navigation, identity, commands, search and media controls.
// Its contract stays a stub: `content` is typed in src/svelte/infra and two props hand out HTML elements (migration debt).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarLayoutContract } from "./toolbar-layout.contract.ts";

export const ToolbarLayout = defineComposition({
  id: "toolbar-layout",
  purpose: "Keep navigation and contextual commands in the surface toolbar; reveal its title and subtitle only after the content header scrolls away.",
  owner: { entry: "ToolbarLayout.svelte", parts: ["CatalogNavigationActions.svelte", "ToolbarIdentity.svelte", "toolbar-identity.ts", "toolbar-layout.css"] },
  uses: ["face", "icon", "node-renderer", "playback-controls", "speed-dial", "toolbar-media-controls", "toolbar-search", "zoom-controls"], approval: "required", contract: ToolbarLayoutContract,
} as const);
