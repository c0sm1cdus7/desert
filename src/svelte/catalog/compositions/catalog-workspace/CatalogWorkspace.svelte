<script lang="ts" generics="Destination extends string">
  import { tick } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import { CatalogNavigation } from "../../index.ts";
  import CatalogNavigationToggle from "./CatalogNavigationToggle.svelte";
  import CatalogToolbar from "./CatalogToolbar.svelte";
  import { ToolbarLayout } from "../../index.ts";
  import { PlaceHeading } from "../../index.ts";
  import { observePlaceHeading } from "./place-heading-motion.ts";
  import type { PlaceIdentity } from "../../../infra/place-identity.ts";
  import CatalogEdgeNavigation from "./CatalogEdgeNavigation.svelte";
  import { Place } from "../../index.ts";
  import AdaptiveSurfaceLayout from "./AdaptiveSurfaceLayout.svelte";
  import type { WorkspaceDestination } from "../../../infra/workspace-navigation.ts";
  import type { ToolbarAction, BottomToolbar } from "../../../../interaction/toolbar.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import { CatalogWorkspaceContent } from "../../index.ts";
  import { CatalogSearchResults } from "../../index.ts";
  import { Toolbar } from "../../index.ts";
  import { Panel } from "../../index.ts";
  import { FailureDialog } from "../../index.ts";
  import { Wallpaper } from "../../index.ts";
  import { appearance } from "../../../infra/appearance-state.ts";
  import type { WorkspaceContent, WorkspaceSearch, WorkspacePanels, WorkspaceViewportActions } from "../../../infra/workspace-content.ts";
  import { revealSearchTarget } from "../../mechanisms/reveal/reveal.ts";
  import { provideDestinationNavigation } from "../../../infra/destination-navigation.svelte.ts";
  let { navigationSurface, title, navigation, active, query, onquery, onnavigate, content: body, searchContent, searching,
    onsearch, oncancel, detail = false, onback, backAvailable=true, identity, searchAvailable = true, topActions = [], actionGroup, invoke,
    panelState, bottomToolbar, onviewport }: {
    navigationSurface: { title: string; subtitle?: string; settingsPlaceholder?: true } | null;
    title: string; navigation: readonly WorkspaceDestination<Destination>[]; active: Destination;
    query: string; onquery: (query: string) => void; onnavigate: (id: Destination) => void;
    content: WorkspaceContent; searchContent?: WorkspaceSearch;
    searching: boolean; onsearch: () => void; oncancel: () => void;
    detail?: boolean; onback?: () => void; backAvailable?:boolean;
    identity: PlaceIdentity;
    searchAvailable?: boolean; topActions?: readonly ToolbarAction[]; actionGroup?: "create"; invoke?: (intent: SurfaceIntent) => void;
    panelState?: WorkspacePanels; bottomToolbar?: BottomToolbar;
    onviewport?: (actions: WorkspaceViewportActions | null) => void;
  } = $props();
  let owner = $state<HTMLDivElement | null>(null);
  let viewport = $state<HTMLDivElement | null>(null);
  let heading = $state<HTMLElement | null>(null);
  let compact = $state<HTMLDivElement | null>(null);
  const presentation = provideDestinationNavigation(() => active, change => {
    void tick().then(() => {
      if (change.destination !== active) return;
      viewport?.scrollTo({ top: change.kind === "back" ? change.origin.scroll : 0 });
      const origin = change.origin.element;
      // An index may remount after its detail closes. Restore the same semantic
      // action in this destination, not the detached historical button.
      const replacement = origin?.matches('[data-piece="destination-row"][data-destination]')
        ? viewport?.querySelector<HTMLElement>(`[data-piece="destination-row"][data-destination="${CSS.escape(origin.dataset.destination!)}"]`) : null;
      const target = (change.kind === "back" ? origin?.isConnected ? origin : replacement : null)
        ?? heading?.querySelector<HTMLElement>("[data-place-title]");
      target?.focus({ preventScroll: true });
    });
  });
  let presented = $derived(presentation.current(active));
  let presentedIdentity = $derived(presented?.identity ?? identity);
  let presentedDetail = $derived(Boolean(presented) || detail);
  const goBack = () => presented ? presentation.back(active) : onback?.();
  $effect(() => {
    const register = onviewport;
    register?.({
      scrollToTop: () => viewport?.scrollTo({ top: 0 }),
      scrollTop: () => viewport?.scrollTop ?? 0,
      focusTitle: () => viewport?.querySelector<HTMLElement>("[data-place-title]")?.focus({ preventScroll: true }),
      restoreRecord: (top, view, record) => {
        viewport?.scrollTo({ top });
        viewport?.querySelector<HTMLElement>(`[data-view-content="${CSS.escape(view)}"] [data-record="${CSS.escape(record)}"] button`)
          ?.focus({ preventScroll: true });
      },
      revealItem: id => {
        const target = viewport?.querySelector<HTMLElement>(`[data-view-item="${CSS.escape(id)}"]`);
        if (target) revealSearchTarget(target, viewport);
      },
    });
    return () => register?.(null);
  });
  $effect(() => {
    presentedIdentity;
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
  <Wallpaper wallpaper={$appearance.wallpaper} />
  <Sidebar.Provider available={navigationSurface !== null} contentMinWidth="45rem" style="--sidebar-width:var(--catalog-sidebar-width)">
    {#if navigationSurface}
    <Sidebar.Root variant="floating" overlayTitle="Navigation" overlayDescription="Choose a destination.">
      <CatalogNavigation identity={navigationSurface} settingsPlaceholder={navigationSurface.settingsPlaceholder === true}
        {navigation} {active} {onnavigate} {searching} />
    </Sidebar.Root>
    {/if}
    <AdaptiveSurfaceLayout>
    <Place bind:owner bind:viewport landmark="main" destination={active} label={presentedIdentity.title} {searching}
      oncomposition={active => composing = active}>
      {#snippet top()}
      <ToolbarLayout layer="content" inert={searching} identity={presentedIdentity} identityRole="continuation" onidentityElement={element => { compact = element; }}
        content={{ kind: "place-navigation", detail: presentedDetail, onback: goBack, backAvailable: Boolean(presented) || backAvailable, topActions, actionGroup, invoke, searchAvailable }} />
      <CatalogToolbar {title} {query} {onquery} {searching} {resultsId} {searchAvailable} onsearch={openSearch} oncancel={cancel} />
      {/snippet}
      {#snippet content()}<PlaceHeading identity={presentedIdentity} bind:element={heading} /><CatalogWorkspaceContent content={body} {searching} />{/snippet}
      {#snippet bottom()}
        <CatalogNavigationToggle {searching} />
        {#if bottomToolbar && invoke && (bottomToolbar.primary || bottomToolbar.secondary)}
          <Toolbar toolbar={{ edge: "bottom", ...bottomToolbar }} {invoke} />
        {/if}
      {/snippet}
      {#snippet overlay()}
      {#if searching}
        <div bind:this={searchViewport} id={resultsId} data-catalog-search-scroll data-has-query={Boolean(query.trim())}>
          {#if searchContent?.kind === "catalog"}
            <CatalogSearchResults title={searchContent.title} description={searchContent.description} {query}
              results={searchContent.results} onselect={searchContent.onselect} />
          {:else if searchContent?.kind === "view"}
            <CatalogSearchResults title={searchContent.title} description={searchContent.description} {query}
              results={searchContent.results} onselect={searchContent.onselect} />
          {/if}
        </div>
      {/if}
      {/snippet}
    </Place>
    {#if panelState}
      <Panel panel={panelState.panel} onevent={panelState.onevent} />
      <FailureDialog code={panelState.error} uncertain={panelState.uncertain} close={panelState.dismissError} />
    {/if}
    </AdaptiveSurfaceLayout>
    <div data-catalog-search-material data-active={searching} aria-hidden="true"></div>
    <CatalogEdgeNavigation {searching} detail={presentedDetail} onback={presented || backAvailable ? goBack : undefined} {viewport} />
  </Sidebar.Provider>
</div>

<style>
  :global([data-catalog-workspace] [data-adaptive-host]) { position:absolute; inset:0; }
</style>
