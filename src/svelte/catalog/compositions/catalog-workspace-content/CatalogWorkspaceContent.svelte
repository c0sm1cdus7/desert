<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { bindViewEvents } from "../../../../web/client/view-events.ts";
  import { CatalogDetail, CatalogHome, LocalExercises, PublicCatalogBank, ViewContent, ViewRegion } from "../../index.ts";
  let { content, searching }: CatalogProps<"catalog-workspace-content"> = $props();
</script>

<!-- Every visited place stays mounted while hidden (drafts, scroll and pickers survive); only the shown one is active. -->
{#if content.kind === "view-program"}
  {@const model = content}
  {#each model.visited as resolved (resolved.view.id)}
    <ViewRegion kind="retained" id={`place:${resolved.view.id}`} inset visible={resolved.view.id === model.activeView}
      active={resolved.view.id === model.activeView && !searching}>
      <ViewContent {resolved} onevent={bindViewEvents(resolved.owner, model.onevent)}
        album={model.albums[resolved.view.id]?.album ?? null} onalbum={model.onalbum}
        onactions={actions => model.onactions(resolved.view.id, actions)} />
    </ViewRegion>
  {/each}
{:else if content.kind === "public-catalog"}
  {@const model = content}
  <ViewRegion kind="bare" id="place:browse" visible={model.active === "browse" && model.selected === null}>
    <CatalogHome node={model.surface.home} onevent={model.onevent} bodyOnly placement="page" />
  </ViewRegion>
  {#if model.active === "browse" && model.projected.kind === "catalog.detail"}<CatalogDetail node={model.projected} onevent={model.onevent} bodyOnly placement="page" />{/if}
  {#if model.surface.exercises}<ViewRegion kind="retained" id="place:travel-kit" inset visible={model.active === "travel-kit"} active={model.active === "travel-kit" && !searching}><LocalExercises definition={model.surface.exercises} oncatalog={model.onevent} bodyOnly /></ViewRegion>{/if}
  {#if model.bankVisited}<ViewRegion kind="retained" id="place:bank" inset visible={model.active === "bank"} active={model.active === "bank" && !searching}><PublicCatalogBank onactions={model.onactions} surface={model.surface} oncatalog={model.onevent} bodyOnly /></ViewRegion>{/if}
{/if}
