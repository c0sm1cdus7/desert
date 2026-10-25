<script lang="ts">
  import * as Sidebar from "../../../vendor/components/ui/sidebar/index.js";
  import { Wallpaper } from "../../index.ts";
  import { appearance } from "../../../infra/appearance-state.ts";
  import { provideFocusScope, useFocusScope } from "../../../infra/focus-scope.ts";
  import { provideRegionRegistry, useRegionRegistry } from "../../../infra/region-registry.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import ShellBody from "./ShellBody.svelte";
  let { documentTitle, label, destination, searching, hasQuery, detail, backAvailable, resultsId, searchLabel, navigation,
    onnavigate, onback, oncancelsearch, oncomposition, top, content, bottom, search, panels }: CatalogProps<"shell"> = $props();
  // Pieces in the workspace register focus targets and reveals here (a caller may open them above the shell instead).
  const scope = useFocusScope() ?? provideFocusScope();
  const regions = useRegionRegistry() ?? provideRegionRegistry();
  let workspace = $state<HTMLElement | null>(null);
  let body = $state<ReturnType<typeof ShellBody>>();
  export function scrollToTop(): void { body?.scrollToTop(); }
  export function scrollTop(): number { return body?.scrollTop() ?? 0; }
  export function focusTitle(): void { body?.focusTitle(); }
  export function focusContent(): void { body?.focusContent(); }
  export function restoreRecord(top: number, view: string, record: string): void { body?.restoreRecord(top, view, record); }
  export function revealItem(id: string): Promise<boolean> { return body?.revealItem(id) ?? Promise.resolve(false); }
  export function scrollPositions(): { content: number; search: number } { return body?.scrollPositions() ?? { content: 0, search: 0 }; }
  export function restoreScroll(content: number, search: number): void { body?.restoreScroll(content, search); }
  export function focus(key: string): boolean { return body?.focusKey(key) ?? false; }
  export function toggleNavigation(): void { body?.toggleNavigation(); }
</script>

<svelte:head><title>{documentTitle}</title></svelte:head>

<div bind:this={workspace} data-renderer-profile="apple-reference" data-catalog-workspace data-search-active={searching}>
  <Wallpaper wallpaper={$appearance.wallpaper} />
  <Sidebar.Provider available={navigation !== null} contentMinWidth="45rem" style="--sidebar-width:var(--catalog-sidebar-width)">
    <ShellBody bind:this={body} root={() => workspace} {label} {destination} {searching} {hasQuery} {detail} {backAvailable} {resultsId} {searchLabel}
      {navigation} {scope} {regions} {onnavigate} {onback} {oncancelsearch} {oncomposition} {top} {content} {bottom} {search} {panels} />
  </Sidebar.Provider>
</div>
