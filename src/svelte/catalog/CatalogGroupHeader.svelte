<script lang="ts">
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import { catalogGroups, navigateCatalog, type CatalogFamily } from "./navigation.ts";
  let { family }: { family: CatalogFamily } = $props();
  let group = $derived(catalogGroups.find(group => group.family === family)!);
</script>

<header class="flex min-w-0 flex-col gap-2 px-4">
  <div class="flex flex-wrap items-start justify-between gap-3 pt-2">
    <div class="flex min-w-0 flex-col gap-1">
      <h2 id={group.anchor} tabindex="-1" class="type-section scroll-mt-4 break-words">{group.title}</h2>
    </div>
    <Button variant="ghost" size="icon" href="#catalog-search" aria-label="Back to catalog navigation" title="Back to catalog navigation"
      onclick={event => navigateCatalog(event, "catalog-navigation", "catalog-search")}><ArrowUp aria-hidden="true" /></Button>
  </div>
  <p class="type-caption text-muted-foreground max-w-prose">{group.description}</p>
</header>
