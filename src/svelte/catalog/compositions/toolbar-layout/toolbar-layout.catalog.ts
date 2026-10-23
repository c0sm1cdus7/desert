// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ToolbarLayoutContract } from "./toolbar-layout.contract.ts";

export const ToolbarLayout = defineComposition({
  id: "toolbar-layout",
  purpose: "Keep navigation and contextual commands in the surface toolbar; reveal its title and subtitle only after the content header scrolls away.",
  owner: { entry: "ToolbarLayout.svelte", parts: ["CalendarNavigation.svelte", "CatalogNavigationActions.svelte", "ToolbarIdentity.svelte", "toolbar-commands.svelte.ts", "toolbar-identity.ts", "toolbar-layout.css", "toolbar-leading.svelte.ts"] },
  uses: ["node-renderer", "face", "playback-controls", "speed-dial", "toolbar-media-controls", "toolbar-search", "zoom-controls"], approval: "required", contract: ToolbarLayoutContract,
} as const);
