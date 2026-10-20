<script lang="ts">
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import SearchField from "../pieces/SearchField.svelte";
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
  import { InteractionCatalog } from "../../interaction/catalog.ts";
  import { catalogGroups, navigateCatalog, type CatalogEntry } from "./navigation.ts";
  let { query = $bindable(""), entries }: { query?: string; entries: readonly CatalogEntry[] } = $props();
</script>

<nav id="catalog-navigation" aria-label="Catalog navigation" class="flex flex-col gap-3 scroll-mt-4">
  <Field.FieldGroup>
    <Field.Field class="relative">
      <Field.FieldLabel for="catalog-search" class="sr-only left-0 top-0">Find component</Field.FieldLabel>
      <SearchField id="catalog-search" bind:value={query} placeholder="Name, identifier or state" aria-describedby="catalog-search-help" />
      <Field.FieldDescription id="catalog-search-help" class="sr-only left-0 top-0 max-w-px">Filter examples without losing local changes.</Field.FieldDescription>
    </Field.Field>
  </Field.FieldGroup>
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
