<script lang="ts">
  import type { BankNodeFor } from "../../../../interaction/bank-node.ts";
  import type { BankEvent } from "../../../../interaction/bank-events.ts";
  import BankRenderer from "../../renderer/bank-renderer/BankRenderer.svelte";
  import Heading from "../../foundations/heading/Heading.svelte";
  import { currentHeadingOffset, scopeHeadings } from "../../../infra/heading-context.ts";
  let { node, onevent, bodyOnly = false }: { node: BankNodeFor<"catalog.home">; onevent: (event: BankEvent) => void; bodyOnly?: boolean } = $props();
  const id = $props.id();
  // This composition has rails but no page heading of its own.
  if (currentHeadingOffset() > 0) scopeHeadings(-1);
</script>

<div data-catalog-home>
  {#if !bodyOnly}<section data-place-stack="featured" aria-label={node.featured.eyebrow}><BankRenderer node={node.featured} {onevent} /></section>{/if}
  {#each node.groups as group, index (group.id)}
    <section data-catalog-group data-place-stack={group.id} aria-labelledby={`${id}-group-${index}`}>
      <Heading kind="rail-title" id={`${id}-group-${index}`} text={group.title} />
      <div data-catalog-rail data-public-rail={group.title}>
        {#each group.items as item (item.record)}<BankRenderer node={item} {onevent} />{/each}
      </div>
    </section>
  {/each}
</div>
