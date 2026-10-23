<script lang="ts">
  import { catalogGroups, type CatalogFamily } from "./navigation.ts";
  let { family }: { family: CatalogFamily } = $props();
  let group = $derived(catalogGroups.find(group => group.family === family)!);
</script>

<header class="flex min-w-0 flex-col gap-2 px-4">
  <div class="flex flex-wrap items-start justify-between gap-3 pt-2">
    <div class="flex min-w-0 flex-col gap-1">
      <h2 id={group.anchor} tabindex="-1" class="type-section scroll-mt-4 break-words">{group.title}</h2>
    </div>
  </div>
  <p class="type-caption text-muted-foreground max-w-prose">{group.description}</p>
</header>
