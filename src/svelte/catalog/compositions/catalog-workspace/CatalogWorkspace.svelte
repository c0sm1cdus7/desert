<script lang="ts">
  import { tick } from "svelte";
  import { Bar, CatalogSearchResults, CatalogWorkspaceContent, FailureDialog, Panel, PlaceHeading, Shell, Toolbar } from "../../index.ts";
  import { provideDestinationNavigation } from "../../../infra/destination-navigation.svelte.ts";
  import { provideFocusScope, useFocusScope } from "../../../infra/focus-scope.ts";
  import { workspaceNavigation } from "../../../infra/workspace-navigation.ts";
  import type { BarCommand } from "../../../infra/bar-command.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { documentTitle, navigationSurface, title, navigation, active, query, searching, identity, content: body, searchContent,
    detail = false, backAvailable = true, searchAvailable = true, topActions = [], actionGroup, invoke, panelState, bottomToolbar,
    onquery, onnavigate, onsearch, oncancel, onback }: CatalogProps<"catalog-workspace"> = $props();
  // One focus scope for the whole workspace; a caller that opened one above it (to return focus by key itself) shares it.
  const scope = useFocusScope() ?? provideFocusScope();
  let shell = $state<ReturnType<typeof Shell>>();
  const uid = $props.id(), resultsId = `${uid}-results`;
  // A page opened inside a destination (a bank entry) returns where it was opened: the scroll offset and the piece last
  // activated, else the place title.
  const pages = provideDestinationNavigation(() => active, () => ({ focusKey: scope.lastActivated(), scroll: shell?.scrollTop() ?? 0 }),
    change => void tick().then(() => {
      if (change.destination !== active || !shell) return;
      if (change.kind === "back") shell.restoreScroll(change.origin.scroll, shell.scrollPositions().search);
      else shell.scrollToTop();
      const returned = change.kind === "back" && change.origin.focusKey !== null && scope.focus(change.origin.focusKey);
      if (!returned) shell.focusTitle();
    }));
  let presented = $derived(pages.current(active));
  let shown = $derived(presented?.identity ?? identity);
  let showsDetail = $derived(Boolean(presented) || detail);
  let canGoBack = $derived(Boolean(presented) || backAvailable);
  const goBack = () => presented ? pages.back(active) : onback?.();
  let back: BarCommand = $derived({ label: say(m.catalogWorkspace.back), icon: "back", state: canGoBack ? "ready" : "unavailable",
    intent: { kind: "back" } });
  /** The content bar's leading Back goes back here; every other command is the place's. */
  function command(intent: SurfaceIntent) {
    if (intent.kind !== "back") invoke?.(intent);
    else if (canGoBack) goBack();
  }
  let searchField = $derived({ title, query, open: searching, resultsId });
  let shellNavigation = $derived(navigationSurface === null ? null : {
    identity: navigationSurface.subtitle ? { title: navigationSurface.title, subtitle: navigationSurface.subtitle } : { title: navigationSurface.title },
    settingsPlaceholder: navigationSurface.settingsPlaceholder === true, active,
    groups: workspaceNavigation(navigation).map(group => ({ label: group.label,
      items: group.items.map(({ id, label, icon, appearance }) => ({ id, label, icon, appearance })) })),
  });
  export function scrollToTop(): void { shell?.scrollToTop(); }
  export function scrollTop(): number { return shell?.scrollTop() ?? 0; }
  export function focusTitle(): void { shell?.focusTitle(); }
  export function focusContent(): void { shell?.focusContent(); }
  export function restoreRecord(top: number, view: string, record: string): void { shell?.restoreRecord(top, view, record); }
  export function revealItem(id: string): Promise<boolean> { return shell?.revealItem(id) ?? Promise.resolve(false); }
  export function scrollPositions(): { content: number; search: number } { return shell?.scrollPositions() ?? { content: 0, search: 0 }; }
  export function restoreScroll(contentTop: number, searchTop: number): void { shell?.restoreScroll(contentTop, searchTop); }
  export function focus(key: string): boolean { return scope.focus(key); }
  export function toggleNavigation(): void { shell?.toggleNavigation(); }
</script>

<Shell bind:this={shell} {documentTitle} label={shown.title} destination={active} {searching} hasQuery={query.trim() !== ""}
  detail={showsDetail} backAvailable={canGoBack} {resultsId} searchLabel={say(m.catalogWorkspace.searchRegion, { title })} navigation={shellNavigation}
  onnavigate={id => onnavigate?.(id)} onback={goBack} oncancelsearch={() => oncancel?.()}>
  {#snippet top()}
    <Bar edge="top" purpose="commands" layer="content" inert={searching} identity={{ title: shown.title, subtitle: shown.subtitle }}
      identityRole="continuation" leading={showsDetail ? back : undefined} trailing={topActions} group={actionGroup}
      search={searchAvailable ? searchField : undefined} settingsPlaceholder={false} oninvoke={command} />
    {#if searchAvailable}
      <Bar edge="top" purpose="commands" layer="search" identityRole="heading" trailing={[]} search={searchField} settingsPlaceholder={false}
        inert={false} onquery={value => onquery?.(value)} onsearchopen={() => onsearch?.()} onsearchcancel={() => oncancel?.()} />
    {/if}
  {/snippet}
  {#snippet content()}
    <PlaceHeading context="place" title={shown.title} subtitle={shown.subtitle} media={shown.media} />
    <CatalogWorkspaceContent content={body} {searching} />
  {/snippet}
  {#snippet bottom()}
    {#if bottomToolbar && invoke && (bottomToolbar.primary || bottomToolbar.secondary)}
      <Toolbar toolbar={{ edge: "bottom", ...bottomToolbar }} {invoke} />
    {/if}
  {/snippet}
  {#snippet search()}
    {#if searchContent?.kind === "catalog"}
      {@const found = searchContent}
      <CatalogSearchResults title={found.title} description={found.description} {query} results={found.results}
        onselect={result => { if (result.kind !== "content") found.onselect(result); }} />
    {:else if searchContent?.kind === "view"}
      <CatalogSearchResults title={searchContent.title} description={searchContent.description} {query} results={searchContent.results}
        onselect={searchContent.onselect} />
    {/if}
  {/snippet}
  {#snippet panels()}
    {#if panelState}
      <Panel panel={panelState.panel} onevent={panelState.onevent} />
      <FailureDialog code={panelState.error} uncertain={panelState.uncertain} close={panelState.dismissError} />
    {/if}
  {/snippet}
</Shell>
