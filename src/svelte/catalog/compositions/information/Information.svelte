<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Column, FactRow, List, Text } from "../../index.ts";
  import { groupRelatedItems } from "../../../../interaction/content-groups.ts";
  let { items }: CatalogProps<"information"> = $props();
</script>
<Column gap="regular" measure="reading">
  {#each groupRelatedItems(items) as group}
    {#if group[0]?.kind === "text"}<Text kind="body" inset="row" text={group[0].text} />
    {:else}<List kind="facts" measure="reading">
      {#each group as item}{#if item.kind === "fact"}<FactRow kind="value" label={item.label} value={item.value} />{/if}{/each}
    </List>{/if}
  {/each}
</Column>
