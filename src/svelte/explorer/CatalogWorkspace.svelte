<script lang="ts" generics="Destination extends string">
  import { tick, type Snippet } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import CatalogNavigation from "./CatalogNavigation.svelte";
  import CatalogToolbar from "./CatalogToolbar.svelte";
  import CatalogNavigationActions from "./CatalogNavigationActions.svelte";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import PlaceHeading from "../pieces/PlaceHeading.svelte";
  import ToolbarIdentity from "../pieces/ToolbarIdentity.svelte";
  import { observePlaceHeading } from "../pieces/place-heading-motion.ts";
  import type { PlaceIdentity } from "../pieces/place-identity.ts";
  import CatalogEdgeNavigation from "./CatalogEdgeNavigation.svelte";
  import Place from "../pieces/Place.svelte";
  import AdaptiveSurfaceLayout from "../pieces/AdaptiveSurfaceLayout.svelte";
  import type { WorkspaceDestination } from "./workspace-navigation.ts";
  import type { ToolbarAction } from "../../interaction/toolbar.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  let { productName, title, navigation, active, query, onquery, onnavigate, children, searchResults, searching,
    onsearch, oncancel, detail = false, onback, identity, searchAvailable = true, topActions = [], invoke,
    panels, bottom, viewport = $bindable(null) }: {
    productName: string; title: string; navigation: readonly WorkspaceDestination<Destination>[]; active: Destination;
    query: string; onquery: (query: string) => void; onnavigate: (id: Destination) => void;
    children: Snippet; searchResults: Snippet; searching: boolean; onsearch: () => void; oncancel: () => void;
    detail?: boolean; onback?: () => void;
    identity: PlaceIdentity;
    searchAvailable?: boolean; topActions?: readonly ToolbarAction[]; invoke?: (intent: SurfaceIntent) => void;
    /** Renderer-private composition; product View data never receives snippets. */
    panels?: Snippet; bottom?: Snippet; viewport?: HTMLDivElement | null;
  } = $props();
  let owner = $state<HTMLDivElement | null>(null);
  let heading = $state<HTMLElement | null>(null);
  let compact = $state<HTMLDivElement | null>(null);
  $effect(() => {
    identity;
    if (viewport && heading && compact) return observePlaceHeading(viewport, heading, compact);
  });
  let searchViewport = $state<HTMLDivElement | null>(null);
  const instanceId = $props.id();
  const resultsId = `${instanceId}-results`;
  let composing = false;
  let contentFocus: HTMLElement | null = null;
  let searchOpener: HTMLElement | null = null;
  let searchPointerActivation: Element | null = null;
  $effect(() => { active; contentFocus = null; });
  function ownsPointerFocus(target: EventTarget | null) {
    // WebKit may focus a tabindex ancestor instead of the pressed button.
    // Keep only that activation alive; unrelated external focus still cancels.
    return target instanceof Node && searchPointerActivation !== null && target.contains(searchPointerActivation);
  }
  function rememberFocus(event: FocusEvent) {
    if (!searching && event.target instanceof HTMLElement && viewport?.contains(event.target)) {
      contentFocus = event.target;
    } else if (searching && !inSearch(event.target) && !ownsPointerFocus(event.target)) {
      void cancel(false);
    }
  }
  function inSearch(target: EventTarget | null): boolean {
    return target instanceof Node && Boolean(searchViewport?.contains(target)
      || owner?.querySelector("[data-catalog-search-actions]")?.contains(target));
  }
  async function cancel(restoreFocus = true) {
    oncancel();
    if (!restoreFocus) return;
    await tick();
    const target = searchOpener?.isConnected && searchOpener.checkVisibility() ? searchOpener
      : contentFocus && viewport?.contains(contentFocus)
      && contentFocus.checkVisibility() && !contentFocus.matches(":disabled,[aria-disabled='true']")
      ? contentFocus : viewport;
    target?.focus({ preventScroll: true });
  }
  function openSearch() {
    searchOpener = owner?.querySelector<HTMLElement>('[data-catalog-search-toggle]') ?? null;
    onsearch();
  }
  function focusOut(event: FocusEvent) {
    // Browsers can expose BODY between focusout and focusin. The announced
    // internal destination is authoritative; otherwise inspect settled focus.
    if (!searching || inSearch(event.relatedTarget)) return;
    requestAnimationFrame(() => {
      if (searching && !inSearch(document.activeElement) && !ownsPointerFocus(document.activeElement)) void cancel(false);
    });
  }
  function pointerDown(event: PointerEvent) {
    searchPointerActivation = null;
    if (!searching || !(event.target instanceof Element)) return;
    // Result activation owns its own close/navigation transaction. Clear and X
    // also belong to search, so pointer focus changes must not swallow them.
    const activation = event.target.closest("[data-catalog-search-actions],[data-search-result]");
    if (activation) { searchPointerActivation = activation; return; }
    const takesFocus = event.target.closest("button,a[href],input,textarea,select,[tabindex]:not([tabindex='-1'])");
    void cancel(!takesFocus);
  }
  function finishPointerActivation() {
    const activation = searchPointerActivation;
    if (!activation) return;
    // Click follows pointerup. Reconcile after it, including cancelled/dragged
    // gestures that never activated a result, without retaining stale ownership.
    requestAnimationFrame(() => {
      if (searchPointerActivation !== activation) return;
      searchPointerActivation = null;
      if (searching && !inSearch(document.activeElement)) void cancel(false);
    });
  }
  function keydown(event: KeyboardEvent) {
    if (!searching || !inSearch(event.target) || event.defaultPrevented || event.key !== "Escape" || event.isComposing || composing || event.keyCode === 229) return;
    event.preventDefault(); event.stopPropagation(); void cancel();
  }
</script>

<!-- Search owns Escape only while focus is in its own surface. Capture keeps a
     concurrently docked task's dialog layer from consuming that local action. -->
<svelte:window onkeydowncapture={keydown} onfocusin={rememberFocus} onfocusout={focusOut} onpointerdown={pointerDown}
  onpointerup={finishPointerActivation} onpointercancel={finishPointerActivation} />

<div data-renderer-profile="apple-reference" data-catalog-workspace data-search-active={searching}>
  <Sidebar.Provider contentMinWidth="45rem" style="--sidebar-width:var(--catalog-sidebar-width)">
    <Sidebar.Root variant="floating" overlayTitle="Navigation" overlayDescription="Choose a destination.">
      <CatalogNavigation {productName} {navigation} {active} {onnavigate} {searching} />
    </Sidebar.Root>
    <AdaptiveSurfaceLayout>
    <Place bind:owner bind:viewport {bottom} role="main" data-catalog-content data-destination={active} tabindex={-1} aria-label={title}
      oncompositionstart={() => composing = true} oncompositionend={() => composing = false}
      viewportAttributes={{ 'data-catalog-scroll': '', tabindex: -1, inert: searching, 'aria-hidden': searching ? 'true' : undefined }}>
      {#snippet top()}
      <ToolbarLayout data-place-toolbar inert={searching} aria-hidden={searching}>
        <CatalogNavigationActions {detail} {onback} {topActions} {invoke} />
        <ToolbarIdentity {identity} bind:element={compact} />
      </ToolbarLayout>
      <CatalogToolbar {title} {query} {onquery} {searching} {resultsId} {searchAvailable} onsearch={openSearch} oncancel={cancel} />
      {/snippet}
      {#snippet content()}<PlaceHeading {identity} bind:element={heading} />{@render children()}{/snippet}
      {#snippet overlay()}
      {#if searching}
        <div bind:this={searchViewport} id={resultsId} data-catalog-search-scroll data-has-query={Boolean(query.trim())}>{@render searchResults()}</div>
      {/if}
      {/snippet}
    </Place>
    {@render panels?.()}
    </AdaptiveSurfaceLayout>
    <div data-catalog-search-material data-active={searching} aria-hidden="true"></div>
    <CatalogEdgeNavigation {searching} {detail} {onback} {viewport} />
  </Sidebar.Provider>
</div>

<style>
  :global([data-catalog-workspace] [data-adaptive-host]) { position:absolute; inset:0; }
</style>
