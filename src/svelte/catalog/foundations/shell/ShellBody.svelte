<script lang="ts">
  // Shell part (from CatalogWorkspace): everything inside the sidebar provider — the navigation pane, the main place with
  // its bars, the navigation return, the search overlay and material, the panels and the edge swipe — and the
  // viewport operations the entry exposes. DOM stays here: callers reach it through the entry's instance.
  import type { Snippet } from "svelte";
  import * as Sidebar from "../../../vendor/components/ui/sidebar/index.js";
  import { Bar, Surface } from "../../index.ts";
  import type { ShellNavigation as Navigation } from "../../../infra/workspace-navigation.ts";
  import type { FocusScope } from "../../../infra/focus-scope.ts";
  import type { RegionRegistry } from "../../../infra/region-registry.ts";
  import { provideSurfaceTypography } from "../../../infra/surface-typography.svelte.ts";
  import AdaptiveSurfaceLayout from "./AdaptiveSurfaceLayout.svelte";
  import CatalogEdgeNavigation from "./CatalogEdgeNavigation.svelte";
  import ShellNavigation from "./ShellNavigation.svelte";
  import { observePlaceHeading } from "./place-heading-motion.ts";
  import { searchFocus } from "./search-focus.svelte.ts";
  let { root, label, destination, searching, hasQuery, detail, backAvailable, resultsId, searchLabel, navigation, scope, regions,
    onnavigate, onback, oncancelsearch, oncomposition, top, content, bottom, search, panels }: {
    root: () => HTMLElement | null; label: string; destination: string; searching: boolean; hasQuery: boolean; detail: boolean; backAvailable: boolean;
    resultsId: string; searchLabel: string | undefined; navigation: Navigation | null; scope: FocusScope; regions: RegionRegistry;
    onnavigate?: ((id: string) => void) | undefined; onback?: (() => void) | undefined;
    oncancelsearch?: ((restoreFocus: boolean) => void) | undefined; oncomposition?: ((active: boolean) => void) | undefined;
    top?: Snippet | undefined; content?: Snippet | undefined; bottom?: Snippet | undefined; search?: Snippet | undefined;
    panels?: Snippet | undefined;
  } = $props();
  const sidebar = Sidebar.useSidebar();
  // Portals launched from the workspace keep its density: comfortable over the overlay navigation, compact beside the docked one.
  provideSurfaceTypography(() => sidebar.presentation === "overlay" ? "comfortable" : "compact");
  let results = $state<HTMLElement | null>(null);
  let place = $state<{ scrollToTop(): void; scrollTop(): number; scrollTo(top: number): void } | undefined>();
  let composing = false;
  // The main place's own viewport (a surface part): found in this shell's subtree, never across the document.
  let viewport = $state<HTMLElement | null>(null);
  $effect(() => { viewport = root()?.querySelector<HTMLElement>("[data-catalog-content] > [data-catalog-scroll]") ?? null; });
  const focus = searchFocus({ root: () => root(), viewport: () => viewport, results: () => results, searching: () => searching,
    composing: () => composing, cancel: restoreFocus => oncancelsearch?.(restoreFocus) });
  $effect(() => { destination; focus.reset(); });
  $effect(() => { if (searching) focus.opened(); });
  // The place heading docks into the content bar's continuation identity as it scrolls away.
  $effect(() => {
    label; destination;
    const heading = viewport?.querySelector<HTMLElement>("[data-place-header]");
    const compact = root()?.querySelector<HTMLElement>("[data-place-toolbar] [data-toolbar-identity]");
    if (viewport && heading && compact) return observePlaceHeading(viewport, heading, compact);
  });
  export function scrollToTop(): void { place?.scrollToTop(); }
  export function scrollTop(): number { return place?.scrollTop() ?? 0; }
  export function focusTitle(): void { viewport?.querySelector<HTMLElement>("[data-place-title]")?.focus({ preventScroll: true }); }
  /** The main place itself (a programmatic return target, never a tab stop) takes focus, as a navigation lands there. */
  export function focusContent(): void { viewport?.closest<HTMLElement>("[data-catalog-content]")?.focus({ preventScroll: true }); }
  /** Scrolls back to `top` and focuses the record's card, which answers to `catalog-return:<record>` in this scope (lane B:
   * the catalog card is a Card with that focus key and draws no record mark). The view's own card is the newest
   * registration of its record or, when that one is hidden, the one it covers takes focus, so `view` needs no lookup. */
  export function restoreRecord(top: number, _view: string, record: string): void {
    place?.scrollTo(top);
    scope.focus(`catalog-return:${record}`);
  }
  export function revealItem(id: string): Promise<boolean> { return regions.reveal(id, true); }
  export function scrollPositions() { return { content: place?.scrollTop() ?? 0, search: results?.scrollTop ?? 0 }; }
  export function restoreScroll(content: number, search: number): void { place?.scrollTo(content); results?.scrollTo(0, search); }
  export function focusKey(key: string): boolean { return scope.focus(key); }
  export function toggleNavigation(): void { sidebar.toggle(); }
</script>

<!-- Search owns Escape only while focus is in its own surface. Capture keeps a concurrently docked task's dialog layer
     from consuming that local action. -->
<svelte:window onkeydowncapture={focus.keydown} onfocusin={focus.focusin} onfocusout={focus.focusout} onpointerdown={focus.pointerdown}
  onpointerup={focus.pointerfinish} onpointercancel={focus.pointerfinish} />

{#if navigation}
  <Sidebar.Root variant="floating" overlayTitle="Navigation" overlayDescription="Choose a destination.">
    <ShellNavigation {navigation} {searching} onnavigate={id => onnavigate?.(id)} />
  </Sidebar.Root>
{/if}
<AdaptiveSurfaceLayout fill>
    <Surface bind:this={place} kind="main" {destination} {label} {searching} oncomposition={active => { composing = active; oncomposition?.(active); }}>
      {#snippet top()}{@render top?.()}{/snippet}
      {#snippet content()}{@render content?.()}{/snippet}
      {#snippet bottom()}
        {#if sidebar.available && !sidebar.expanded}
          <div data-navigation-return><Bar edge="bottom" purpose="navigation" identityRole="heading" trailing={[]}
            navigationToggle={{ expanded: false, controls: sidebar.panelId }} settingsPlaceholder={false} inert={searching}
            onnavigationtoggle={sidebar.toggle} /></div>
        {/if}
        {@render bottom?.()}
      {/snippet}
      {#snippet overlay()}
        {#if searching}<div bind:this={results} id={resultsId} role={searchLabel ? "region" : undefined} aria-label={searchLabel} data-catalog-search-scroll data-has-query={hasQuery}>{@render search?.()}</div>{/if}
      {/snippet}
    </Surface>
    {@render panels?.()}
</AdaptiveSurfaceLayout>
<div data-catalog-search-material data-active={searching} aria-hidden="true"></div>
<CatalogEdgeNavigation {searching} {detail} onback={backAvailable ? () => onback?.() : undefined} {viewport} />
