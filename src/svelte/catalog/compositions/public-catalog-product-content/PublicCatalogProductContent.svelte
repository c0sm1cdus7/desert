<script lang="ts">
  import { onMount, tick, untrack, setContext } from "svelte";
  import { AppearanceRoot, CatalogWorkspace } from "../../index.ts";
  import { initialPublicCatalogState, projectPublicCatalog, reducePublicCatalog, publicCatalogSurface,
    type PublicCatalogState } from "../../../../public-catalog/client.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import type { PlaceIdentity } from "../../../infra/place-identity.ts";
  import { catalogSearchResults, catalogSearchScope, type CatalogDestination, type CatalogSearchResult } from "../../../infra/catalog-search.ts";
  import type { WorkspaceContentActions } from "../../../infra/workspace-content.ts";
  import { provideFocusScope } from "../../../infra/focus-scope.ts";
  import { catalogHistory } from "./catalog-history.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { surface }: CatalogProps<"public-catalog-product-content"> = $props();
  const definition = untrack(() => publicCatalogSurface(surface));
  setContext('catalog-photo-intent', (record: string) => definition.details.find(detail=>detail.record===record)?.image.asset);
  // The workspace's focus scope, opened here: what opened a detail is returned to by its key (`catalog-return:<record>`,
  // `search:<id>`), never by an element.
  const focusScope = provideFocusScope();
  let workspace = $state<ReturnType<typeof CatalogWorkspace>>();
  let viewState = $state.raw(initialPublicCatalogState());
  let active = $state<CatalogDestination>("browse");
  let bankVisited = $state(false);
  let searching = $state(false);
  let searchQuery = $state("");
  let bank: WorkspaceContentActions | null = null;
  let view = $derived(projectPublicCatalog(definition, viewState));
  let scope = $derived(catalogSearchScope(definition, active));
  let results = $derived(catalogSearchResults(definition, active, searchQuery));
  let identity: PlaceIdentity = $derived(active === "bank"
    ? { title: say(m.publicCatalogProductContent.bank), subtitle: say(m.publicCatalogProductContent.bankSubtitle) }
    : active === "travel-kit" && definition.exercises
      ? { title: definition.exercises.title, subtitle: definition.exercises.subtitle }
      : view.content.kind === "catalog.detail"
        ? { title: view.content.title,
          subtitle: definition.home.groups.find(group => group.items.some(item => item.record === viewState.selectedId))?.title ?? '',
          media: view.content.gallery ? { kind: 'gallery', images:view.content.gallery } : { kind: 'image', ...view.content.image } }
        : { title: definition.title, subtitle: definition.description, media: definition.featuredMedia
          ?? (definition.home.featured.image ? { kind: 'image', ...definition.home.featured.image } : undefined) });
  type Origin = { focus: string | null; scroll: number; destination: CatalogDestination; state: PublicCatalogState;
    search?: { query: string; scroll: number }; previous?: Origin };
  let opener: Origin | undefined;
  // The key of the piece focus returns to (the opener of the shown detail, once focus is back on it); a navigation clears it.
  let returnTo: string | null = null;
  type Snapshot = { active: CatalogDestination; state: PublicCatalogState; opener?: Origin;
    searching: boolean; query: string; scroll: number; searchScroll: number; focus?: string };
  let browserNavigation: ReturnType<typeof catalogHistory<Snapshot>> | undefined;
  const navigation = [{ id: "browse", label: definition.title },
    ...(definition.exercises ? [{ id: "travel-kit", label: definition.exercises.title } as const] : []),
    { id: "bank", label: say(m.publicCatalogProductContent.bank) }] as const;
  const destinationOf = (id: string): CatalogDestination => {
    if (id === "browse" || id === "bank" || id === "travel-kit" && definition.exercises) return id;
    throw new Error("UNKNOWN_CATALOG_DESTINATION");
  };
  const positions = () => workspace?.scrollPositions() ?? { content: 0, search: 0 };
  function cancelSearch() { searching = false; searchQuery = ""; }
  async function querySearch(query: string) {
    searchQuery = query; searching = true;
    await tick(); workspace?.restoreScroll(positions().content, 0);
  }
  async function event(input: NodeEvent) {
    if (input.kind !== "catalog.open" && input.kind !== "catalog.back" && input.kind !== "catalog.search") return;
    if (input.kind === "catalog.search") { await querySearch(input.query); return; }
    if (input.kind === "catalog.open") {
      // The activated card (or search result) is the opener even when pointer activation focuses no button (WebKit).
      returnTo = focusScope.lastActivated();
      browserNavigation?.capture();
      const { content, search } = positions();
      opener = { focus: returnTo, scroll: content, destination: active, state: viewState, previous: opener,
        ...(searching ? { search: { query: searchQuery, scroll: search } } : {}) };
      viewState = reducePublicCatalog(definition, viewState, input);
      active = "browse"; cancelSearch();
      await tick();
      workspace?.scrollToTop();
      workspace?.focusTitle();
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
    workspace?.restoreScroll(origin?.scroll ?? 0, origin?.search?.scroll ?? 0);
    returnTo = origin?.focus ?? null;
    if (returnTo !== null) focusScope.focus(returnTo);
    browserNavigation?.capture();
  }
  async function selectSearchResult(result: CatalogSearchResult) {
    if (result.kind === "record") { await event({ kind: "catalog.open", record: result.id }); return; }
    cancelSearch(); await tick();
    if (result.kind === "bank") { await bank?.revealEntry(result.id); return; }
    await workspace?.revealItem(result.id);
  }
  async function navigate(id: string) {
    const destination = destinationOf(id);
    if (destination === active && viewState.selectedId === null) return;
    returnTo = null;
    browserNavigation?.capture();
    if (destination === "bank") bankVisited = true;
    active = destination;
    cancelSearch(); opener = undefined;
    if (destination === "browse") viewState = reducePublicCatalog(definition, viewState, { kind: "catalog.back" });
    await tick(); workspace?.scrollToTop();
    workspace?.focusContent();
    browserNavigation?.push();
  }
  onMount(() => {
    const location = new URL(window.location.href);
    const place = location.searchParams.get('place'), record = location.searchParams.get('record');
    if (place === 'bank' || (place === 'travel-kit' && definition.exercises)) active = place;
    bankVisited = active === 'bank';
    if (record && active === 'browse') {
      try { viewState = reducePublicCatalog(definition, viewState, { kind: 'catalog.open', record }); }
      catch { /* Unknown public record: retain the safe catalog home. */ }
    }
    browserNavigation = catalogHistory<Snapshot>(() => ({ active, state: viewState, opener, searching, query: searchQuery,
      scroll: positions().content, searchScroll: positions().search, ...(returnTo === null ? {} : { focus: returnTo }) }), async snapshot => {
      active = snapshot.active; viewState = snapshot.state; opener = snapshot.opener;
      bankVisited ||= active === 'bank'; searching = snapshot.searching; searchQuery = snapshot.query;
      await tick(); workspace?.restoreScroll(snapshot.scroll, snapshot.searchScroll);
      returnTo = snapshot.focus ?? null;
      if (returnTo === null || !focusScope.focus(returnTo)) workspace?.focusTitle();
    }, snapshot => {
      const url = new URL(window.location.href);
      if (snapshot.active === 'browse') url.searchParams.delete('place'); else url.searchParams.set('place', snapshot.active);
      if (snapshot.active === 'browse' && snapshot.state.selectedId) url.searchParams.set('record', snapshot.state.selectedId);
      else url.searchParams.delete('record');
      return url.href;
    });
    return () => {
      browserNavigation?.dispose();
    };
  });
</script>

<AppearanceRoot />
<CatalogWorkspace bind:this={workspace} documentTitle={say(m.publicCatalogProductContent.documentTitle, { title: definition.title })}
  navigationSurface={{ title:definition.title, settingsPlaceholder:true }} title={scope.title} {identity} {navigation} {active} query={searchQuery} {searching}
  onquery={querySearch} onsearch={() => searching = true} oncancel={cancelSearch} onnavigate={navigate}
  detail={active === "browse" && viewState.selectedId !== null} onback={() => void event({ kind: "catalog.back" })}
  searchContent={{ kind: "catalog", title: scope.title, description: scope.description, results, onselect: selectSearchResult }}
  content={{ kind: "public-catalog", surface: definition, projected: view.content, active, selected: viewState.selectedId,
    bankVisited, onevent: event, onactions: actions => { bank = actions; } }} />
