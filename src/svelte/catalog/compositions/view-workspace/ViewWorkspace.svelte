<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import { mountCatalogAppearance } from "../../../infra/catalog-appearance.ts";
  import CatalogWorkspace from "../catalog-workspace/CatalogWorkspace.svelte";
  import type { WorkspaceSearchResult } from "../../../infra/workspace-search.ts";
  import { bindViewEvents, type OwnedResolvedView, type OwnedViewEvent } from "../../../../web/client/view-events.ts";
  import { provideFrameActivation } from "../../../infra/frame-continuity.svelte.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { WorkspaceContentActions, WorkspaceViewportActions } from "../../../infra/workspace-content.ts";
  import { viewIdentity, viewSearchResults, viewSearchSelection } from "./workspace-data.ts";
  import { viewMedia, mediaIdentity, mediaResults } from "../../../infra/media-data.ts";
  import type { WorkspaceProps } from "../../../infra/view-types.ts";
  import { resolveProgramWorkspace } from "../../../../views/program-workspace.ts";
  let props: WorkspaceProps = $props();
  const activateFrame = provideFrameActivation();
  function send(event: OwnedViewEvent) {
    const panel = props.panel, value = event.event;
    if (panel?.frame.kind === "context" && event.owner === props.resolved.owner && value.kind === "surface.invoke"
      && value.intent.kind === "view.output" && value.intent.view === props.resolved.view.id
      && !props.resolved.disabledOutputs.includes(value.intent.output)) activateFrame(panel.owner, () => props.onevent(event));
    else props.onevent(event);
  }
  let workspace = $derived(resolveProgramWorkspace(props.program));
  onMount(mountCatalogAppearance);
  let searching = $state(false), query = $state("");
  let viewport: WorkspaceViewportActions | null = null;
  let visited = $state.raw<readonly OwnedResolvedView[]>([]);
  const contentOwners: Record<string, WorkspaceContentActions> = {};
  let mediaPositions = $state<Record<string, { album: string | null; top: number; record: string }>>({});
  let album = $derived(mediaPositions[props.resolved.view.id]?.album ?? null);
  let media = $derived(viewMedia(props.resolved));
  let homeIdentity = $derived(viewIdentity(props.resolved, props.program.label));
  let identity = $derived(media ? mediaIdentity(media, album, homeIdentity) : homeIdentity);
  let mainBack=$derived(props.resolved.top?.leading?.intent.kind==="back"?props.resolved.top.leading:undefined);
  let results = $derived(media ? mediaResults(media, query) : viewSearchResults(props.resolved, query));
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
      cancelSearch(); viewport?.scrollToTop();
    });
  });
  let destinations = $derived(props.program.navigation.map(entry => {
    const destination = props.program.destinations.find(item => item.id === entry.destination);
    if (!destination) throw new Error("UNRESOLVED_VIEW_DESTINATION");
    return { ...destination, group: entry.group, purpose: entry.purpose };
  }));
  let invoke = $derived.by(() => {
    const receive = bindViewEvents(props.resolved.owner, send);
    return (intent: SurfaceIntent) => receive({ kind: "surface.invoke", intent });
  });
  let dismissError = $derived.by(() => {
    const send = bindViewEvents(props.panel?.owner ?? props.resolved.owner, props.onevent);
    return () => send({ kind: "problem.close" });
  });
  function cancelSearch() { searching = false; query = ""; }
  async function openAlbum(id: string) {
    const view = props.resolved.view.id;
    const origin = mediaPositions[view];
    mediaPositions[view] = { album: id, top: origin?.album ? origin.top : viewport?.scrollTop() ?? 0,
      record: origin?.album ? origin.record : `album.${id}` };
    await tick();
    if (props.resolved.view.id !== view) return;
    viewport?.scrollToTop();
    viewport?.focusTitle();
  }
  async function closeAlbum() {
    const view = props.resolved.view.id, origin = mediaPositions[view];
    if (!origin) return;
    mediaPositions[view] = { ...origin, album: null }; cancelSearch(); await tick();
    if (props.resolved.view.id !== view) return;
    viewport?.restoreRecord(origin.top, view, origin.record);
  }
  async function selectSearchResult(result: WorkspaceSearchResult) {
    const resolved = props.resolved, receive = bindViewEvents(resolved.owner, send);
    cancelSearch(); await tick();
    if (props.resolved.owner !== resolved.owner) return;
    const owner = contentOwners[resolved.view.id];
    if (media && owner?.selectMedia(result.id)) return;
    const selection = viewSearchSelection(resolved, result.id);
    if (selection) { receive(selection); return; }
    if (result.kind === "bank") { await owner?.revealEntry(result.id); return; }
    viewport?.revealItem(result.id);
  }
</script>

<svelte:head><title>{props.resolved.top?.title ?? props.program.label} · {props.program.label}</title></svelte:head>

<CatalogWorkspace navigationSurface={workspace.navigation ?? null} title={identity.title} {identity}
  navigation={destinations} active={props.activeDestination} {query} {searching} onviewport={actions => { viewport = actions; }}
  detail={Boolean(media && album || mainBack)} backAvailable={Boolean(media&&album)||mainBack?.state==="ready"}
  onback={()=>{if(media&&album) void closeAlbum();else if(mainBack?.state==="ready") invoke(mainBack.intent);}}
  onquery={value => { query = value; searching = true; }} onsearch={() => searching = true}
  oncancel={cancelSearch} onnavigate={props.onnavigate} topActions={props.resolved.top?.trailing} actionGroup={props.resolved.top?.actionGroup} {invoke}
  searchContent={{ kind: "view", title: identity.title, description: "Find content in this destination.", results, onselect: selectSearchResult }}
  bottomToolbar={props.resolved.bottom}
  panelState={{ panel: props.panel, onevent: props.onevent, error: props.error, uncertain: props.uncertain, dismissError }}
  content={{ kind: "view-program", visited, activeView: props.resolved.view.id, albums: mediaPositions,
    onevent: send, onalbum: openAlbum,
    onactions: (id, actions) => { if (actions) contentOwners[id] = actions; else delete contentOwners[id]; } }} />
