<script lang="ts">
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import { InteractionCatalog } from "../../interaction/catalog.ts";
  import { catalogGroups, navigateCatalog, type CatalogEntry } from "./navigation.ts";
  let { entries }: { entries: readonly CatalogEntry[] } = $props();
</script>

<nav id="catalog-navigation" tabindex="-1" aria-label="Catalog navigation" class="flex flex-col gap-3 scroll-mt-4">
  <div class="flex flex-wrap items-center gap-2">
    {#each catalogGroups as group (group.family)}
      {@const count = entries.filter(entry => entry.inspection.group === group.id).length}
      {#if count > 0}
        <Button variant="secondary" size="sm" class="max-w-full whitespace-normal text-left" href={`#${group.anchor}`} onclick={event => navigateCatalog(event, group.anchor)}>
          <span class="type-caption">{group.title} <span aria-hidden="true">· {count}</span></span>
        </Button>
      {/if}
    {/each}
  </div>
  <p role="status" aria-live="polite" class="type-caption text-muted-foreground">
    {entries.length} of {InteractionCatalog.entries.length} components · {entries.reduce((count, entry) => count + entry.inspection.fixtures.length, 0)} fixtures
  </p>
</nav>
