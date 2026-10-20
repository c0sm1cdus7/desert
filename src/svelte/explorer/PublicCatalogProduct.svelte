<script lang="ts">
  import { onMount, tick, untrack, setContext } from "svelte";
  import { initialPublicCatalogState, projectPublicCatalog, reducePublicCatalog, publicCatalogSurface,
    type PublicCatalogSurface, type PublicCatalogState } from "../../public-catalog/client.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import CatalogWorkspace from "./CatalogWorkspace.svelte";
  import RetainedPlace from "./RetainedPlace.svelte";
  import CatalogHome from "./CatalogHome.svelte";
  import CatalogDetail from "./CatalogDetail.svelte";
  import type { PlaceIdentity } from "../pieces/place-identity.ts";
  import LocalExercises from "./LocalExercises.svelte";
  import PublicCatalogBank from "./PublicCatalogBank.svelte";
  import CatalogSearchResults from "./CatalogSearchResults.svelte";
  import { catalogSearchResults, catalogSearchScope, type CatalogDestination, type CatalogSearchResult } from "./catalog-search.ts";
  import { revealSearchTarget } from "./catalog-search-focus.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import { catalogHistory } from "./catalog-history.ts";
  import "../theme.css";
  let { surface }: { surface: PublicCatalogSurface } = $props();
  const definition = untrack(() => publicCatalogSurface(surface));
  setContext('catalog-photo-intent', (record: string) => definition.details.find(detail=>detail.record===record)?.image.asset);
  let viewState = $state.raw(initialPublicCatalogState());
  let active = $state<CatalogDestination>("browse");
  let bankVisited = $state(false);
  let bankQuery = $state("");
  let searching = $state(false);
  let searchQuery = $state("");
  let bank = $state<{ revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> } | null>(null);
  let view = $derived(projectPublicCatalog(definition, viewState));
  let scope = $derived(catalogSearchScope(definition, active));
  let results = $derived(catalogSearchResults(definition, active, searchQuery));
  let identity: PlaceIdentity = $derived(active === "bank"
    ? { title: "Component bank", subtitle: "Interactive examples. Changes stay here; no product commands are executed." }
    : active === "travel-kit" && definition.exercises
      ? { title: definition.exercises.title, subtitle: definition.exercises.subtitle }
      : view.content.kind === "catalog.detail"
        ? { title: view.content.title,
          subtitle: definition.home.groups.find(group => group.items.some(item => item.record === viewState.selectedId))?.title ?? '',
          media: view.content.gallery ? { kind: 'gallery', images:view.content.gallery } : { kind: 'image', ...view.content.image } }
        : { title: definition.title, subtitle: definition.description, media: definition.featuredMedia ?? { kind: 'image', ...definition.home.featured.image } });
  type Origin = { selector: string; scroll: number; destination: CatalogDestination; state: PublicCatalogState;
    search?: { query: string; scroll: number }; previous?: Origin };
  let opener: Origin | undefined;
  type Snapshot = { active: CatalogDestination; state: PublicCatalogState; opener?: Origin;
    searching: boolean; query: string; scroll: number; searchScroll: number; focus?: string };
  let browserNavigation: ReturnType<typeof catalogHistory<Snapshot>> | undefined;
  const navigation = [{ id: "browse", label: definition.title },
    ...(definition.exercises ? [{ id: "travel-kit", label: definition.exercises.title } as const] : []),
    { id: "bank", label: "Component bank" }] as const;
  const scroll = () => document.querySelector<HTMLElement>("[data-catalog-scroll]");
  const searchScroll = () => document.querySelector<HTMLElement>("[data-catalog-search-scroll]");
  function cancelSearch() { searching = false; searchQuery = ""; }
  async function querySearch(query: string) {
    searchQuery = query; searching = true;
    await tick(); searchScroll()?.scrollTo(0, 0);
  }
  async function event(input: BankEvent) {
    if (input.kind !== "catalog.open" && input.kind !== "catalog.back" && input.kind !== "catalog.search") return;
    if (input.kind === "catalog.search") { await querySearch(input.query); return; }
    if (input.kind === "catalog.open") {
      const focused = document.activeElement as HTMLElement | null;
      const marker = `catalog-return-${crypto.randomUUID()}`;
      if (focused) focused.dataset.catalogReturn = marker;
      browserNavigation?.capture();
      opener = { selector: searching ? `[data-search-result="${input.record}"] button` : `[data-catalog-return="${marker}"]`,
        scroll: scroll()?.scrollTop ?? 0, destination: active, state: viewState, previous: opener,
        ...(searching ? { search: { query: searchQuery, scroll: searchScroll()?.scrollTop ?? 0 } } : {}) };
      viewState = reducePublicCatalog(definition, viewState, input);
      active = "browse"; cancelSearch();
      await tick();
      scroll()?.scrollTo(0, 0);
      document.querySelector<HTMLElement>("[data-place-header] [data-place-title]")?.focus({ preventScroll: true });
      browserNavigation?.push();
      return;
    }
    if (browserNavigation?.back()) return;
    const origin = opener;
    opener = origin?.previous;
    viewState = origin?.state ?? reducePublicCatalog(definition, viewState, input);
    active = origin?.destination ?? "browse";
    searching = Boolean(origin?.search); searchQuery = origin?.search?.query ?? "";
    await tick();
    scroll()?.scrollTo(0, origin?.scroll ?? 0);
    if (origin?.search) searchScroll()?.scrollTo(0, origin.search.scroll);
    if (origin) document.querySelector<HTMLElement>(origin.selector)?.focus({ preventScroll: true });
    browserNavigation?.capture();
  }
  async function selectSearchResult(result: CatalogSearchResult) {
    if (result.kind === "record") {
      // The activated result owns the return target even when pointer activation
      // does not focus buttons (WebKit). Capture it before changing the place.
      document.querySelector<HTMLElement>(`[data-search-result="${result.id}"] button`)?.focus({ preventScroll: true });
      await event({ kind: "catalog.open", record: result.id }); return;
    }
    cancelSearch(); await tick();
    const target = result.kind === "bank" ? await bank?.revealEntry(result.id)
      : document.querySelector<HTMLElement>(`[data-place-stack="${result.id}"]`);
    if (target) revealSearchTarget(target, scroll());
  }
  async function navigate(destination: typeof active) {
    if (destination === active && viewState.selectedId === null) return;
    browserNavigation?.capture();
    if (destination === "bank") bankVisited = true;
    active = destination;
    cancelSearch(); opener = undefined;
    if (destination === "browse") viewState = reducePublicCatalog(definition, viewState, { kind: "catalog.back" });
    await tick(); scroll()?.scrollTo(0, 0);
    document.querySelector<HTMLElement>("[data-catalog-content]")?.focus({ preventScroll: true });
    browserNavigation?.push();
  }
  onMount(() => {
    const root = document.documentElement;
    const previous = root.dataset.rendererProfile;
    root.dataset.rendererProfile = "apple-reference";
    const location = new URL(window.location.href);
    const place = location.searchParams.get('place'), record = location.searchParams.get('record');
    if (place === 'bank' || (place === 'travel-kit' && definition.exercises)) active = place;
    bankVisited = active === 'bank';
    if (record && active === 'browse') {
      try { viewState = reducePublicCatalog(definition, viewState, { kind: 'catalog.open', record }); }
      catch { /* Unknown public record: retain the safe catalog home. */ }
    }
    browserNavigation = catalogHistory<Snapshot>(() => ({ active, state: viewState, opener, searching,
      query: searchQuery, scroll: scroll()?.scrollTop ?? 0, searchScroll: searchScroll()?.scrollTop ?? 0,
      focus: document.activeElement?.closest<HTMLElement>('[data-search-result]')
        ? `[data-search-result="${document.activeElement.closest<HTMLElement>('[data-search-result]')!.dataset.searchResult}"] button`
        : (document.activeElement as HTMLElement | null)?.dataset.catalogReturn
          ? `[data-catalog-return="${(document.activeElement as HTMLElement).dataset.catalogReturn}"]` : undefined }), async snapshot => {
      active = snapshot.active; viewState = snapshot.state; opener = snapshot.opener;
      bankVisited ||= active === 'bank'; searching = snapshot.searching; searchQuery = snapshot.query;
      await tick(); scroll()?.scrollTo(0, snapshot.scroll); searchScroll()?.scrollTo(0, snapshot.searchScroll);
      const target = snapshot.focus ? document.querySelector<HTMLElement>(snapshot.focus)
        : document.querySelector<HTMLElement>('[data-place-header] [data-place-title]');
      (target ?? scroll())?.focus({ preventScroll: true });
    }, snapshot => {
      const url = new URL(window.location.href);
      if (snapshot.active === 'browse') url.searchParams.delete('place'); else url.searchParams.set('place', snapshot.active);
      if (snapshot.active === 'browse' && snapshot.state.selectedId) url.searchParams.set('record', snapshot.state.selectedId);
      else url.searchParams.delete('record');
      return url.href;
    });
    return () => {
      browserNavigation?.dispose();
      if (previous === undefined) delete root.dataset.rendererProfile; else root.dataset.rendererProfile = previous;
    };
  });
</script>

<svelte:head><title>{definition.title} · DESERT</title></svelte:head>
<CatalogWorkspace productName={definition.title} title={scope.title} {identity} {navigation} {active} query={searchQuery} {searching}
  onquery={querySearch} onsearch={() => searching = true} oncancel={cancelSearch} onnavigate={navigate}
  detail={active === "browse" && viewState.selectedId !== null} onback={() => void event({ kind: "catalog.back" })}>
  {#snippet searchResults()}
    <CatalogSearchResults title={scope.title} description={scope.description} query={searchQuery} {results} onselect={selectSearchResult} />
  {/snippet}
  <div hidden={active !== "browse" || viewState.selectedId !== null}>
    <CatalogHome node={definition.home} onevent={event} bodyOnly />
  </div>
  {#if active === "browse" && view.content.kind === "catalog.detail"}<CatalogDetail node={view.content} onevent={event} bodyOnly />{/if}
  {#if definition.exercises}<RetainedPlace visible={active === "travel-kit"} active={active === "travel-kit" && !searching}><LocalExercises definition={definition.exercises} oncatalog={event} bodyOnly /></RetainedPlace>{/if}
  {#if bankVisited}<RetainedPlace visible={active === "bank"} active={active === "bank" && !searching}><PublicCatalogBank bind:this={bank} bind:query={bankQuery} surface={definition} oncatalog={event} bodyOnly /></RetainedPlace>{/if}
</CatalogWorkspace>

