<script lang="ts">
  import { tick, untrack } from "svelte";
  import CatalogWorkspace from "../explorer/CatalogWorkspace.svelte";
  import CatalogSearchResults from "../explorer/CatalogSearchResults.svelte";
  import RetainedPlace from "../explorer/RetainedPlace.svelte";
  import { revealSearchTarget } from "../explorer/catalog-search-focus.ts";
  import type { WorkspaceSearchResult } from "../explorer/workspace-search.ts";
  import type { ResolvedView } from "../../views/resolved.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import Toolbar from "../pieces/Toolbar.svelte";
  import FailureDialog from "../FailureDialog.svelte";
  import ViewContent from "./ViewContent.svelte";
  import Panel from "./Panel.svelte";
  import { viewIdentity, viewSearchResults, viewSearchSelection } from "./workspace-data.ts";
  import type { WorkspaceProps } from "./types.ts";
  let props: WorkspaceProps = $props();
  let searching = $state(false), query = $state("");
  let viewport = $state<HTMLDivElement | null>(null);
  let visited = $state.raw<readonly ResolvedView[]>([]);
  let contentOwners = $state<Record<string, { revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> }>>({});
  let identity = $derived(viewIdentity(props.resolved, props.program.label));
  let results = $derived(viewSearchResults(props.resolved, query));
  $effect(() => {
    const next = props.resolved;
    untrack(() => { visited = [...visited.filter(item => item.view.id !== next.view.id), next]; });
  });
  let scrollDestination: string | undefined;
  $effect(() => {
    const destination = props.activeDestination;
    untrack(() => {
      // Availability snapshots may refresh while the user scrolls. Only a real
      // navigation changes the viewport, never another projection of this view.
      if (destination === scrollDestination) return;
      scrollDestination = destination;
      cancelSearch(); viewport?.scrollTo({ top: 0 });
    });
  });
  let destinations = $derived(props.program.navigation.map(id => {
    const destination = props.program.destinations.find(item => item.id === id);
    if (!destination) throw new Error("UNRESOLVED_VIEW_DESTINATION");
    return destination;
  }));
  function invoke(intent: SurfaceIntent) { props.onevent({ kind: "surface.invoke", intent }); }
  function cancelSearch() { searching = false; query = ""; }
  async function selectSearchResult(result: WorkspaceSearchResult) {
    cancelSearch(); await tick();
    const selection = viewSearchSelection(props.resolved, result.id);
    if (selection) { props.onevent(selection); return; }
    const owner = contentOwners[props.resolved.view.id];
    const target = result.kind === "bank" ? await owner?.revealEntry(result.id)
      : viewport?.querySelector<HTMLElement>(`[data-view-item="${CSS.escape(result.id)}"]`);
    if (target) revealSearchTarget(target, viewport);
  }
</script>

<svelte:head><title>{props.resolved.top?.title ?? props.program.label} · {props.program.label}</title></svelte:head>

<CatalogWorkspace productName={props.program.label} title={identity.title} {identity}
  navigation={destinations} active={props.activeDestination} {query} {searching} bind:viewport
  onquery={value => { query = value; searching = true; }} onsearch={() => searching = true}
  oncancel={cancelSearch} onnavigate={props.onnavigate} topActions={props.resolved.top?.trailing} {invoke}>
  {#snippet searchResults()}
    <CatalogSearchResults title={identity.title} description="Find content in this destination."
      {query} {results} onselect={selectSearchResult} />
  {/snippet}
  {#snippet bottom()}
    {#if props.resolved.bottom?.primary || props.resolved.bottom?.secondary}
      <Toolbar toolbar={{ edge: "bottom", ...props.resolved.bottom }} {invoke} />
    {/if}
  {/snippet}
  {#snippet panels()}
    <Panel panel={props.panel} onevent={props.onevent} />
    <FailureDialog code={props.error} uncertain={props.uncertain}
      close={() => props.onevent({ kind: "problem.close" })} />
  {/snippet}
  {#each visited as resolved (resolved.view.id)}
    <RetainedPlace visible={resolved.view.id === props.resolved.view.id}
      active={resolved.view.id === props.resolved.view.id && !searching}>
      <ViewContent bind:this={contentOwners[resolved.view.id]} {resolved} onevent={props.onevent} />
    </RetainedPlace>
  {/each}
</CatalogWorkspace>
