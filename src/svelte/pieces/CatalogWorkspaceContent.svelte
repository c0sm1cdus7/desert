<script lang="ts">
  import type { WorkspaceContent } from "./workspace-content.ts";
  import { bindViewEvents } from "../../web/client/view-events.ts";
  import RetainedPlace from "../explorer/RetainedPlace.svelte";
  import ViewContent from "../views/ViewContent.svelte";
  import CatalogHome from "../explorer/CatalogHome.svelte";
  import CatalogDetail from "../explorer/CatalogDetail.svelte";
  import LocalExercises from "../explorer/LocalExercises.svelte";
  import PublicCatalogBank from "../explorer/PublicCatalogBank.svelte";
  let { content, searching }: { content: WorkspaceContent; searching: boolean } = $props();
</script>

{#if content.kind === "view-program"}
  {@const model = content}
  {#each model.visited as resolved (resolved.view.id)}
    <RetainedPlace visible={resolved.view.id === model.activeView}
      active={resolved.view.id === model.activeView && !searching}>
      <ViewContent {resolved} onevent={bindViewEvents(resolved.owner, model.onevent)}
        album={model.albums[resolved.view.id]?.album ?? null} onalbum={model.onalbum}
        onactions={actions => model.onactions(resolved.view.id, actions)} />
    </RetainedPlace>
  {/each}
{:else if content.kind === "public-catalog"}
  {@const model = content}
  <div hidden={model.active !== "browse" || model.selected !== null}>
    <CatalogHome node={model.surface.home} onevent={model.onevent} bodyOnly />
  </div>
  {#if model.active === "browse" && model.projected.kind === "catalog.detail"}<CatalogDetail node={model.projected} onevent={model.onevent} bodyOnly />{/if}
  {#if model.surface.exercises}<RetainedPlace visible={model.active === "travel-kit"} active={model.active === "travel-kit" && !searching}><LocalExercises definition={model.surface.exercises} oncatalog={model.onevent} bodyOnly /></RetainedPlace>{/if}
  {#if model.bankVisited}<RetainedPlace visible={model.active === "bank"} active={model.active === "bank" && !searching}><PublicCatalogBank onactions={model.onactions} surface={model.surface} oncatalog={model.onevent} bodyOnly /></RetainedPlace>{/if}
{/if}
