<script lang="ts">
  import type { ResolvedNodeFor } from "../../../../interaction/resolved-node.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { NodeRenderer } from "../../index.ts";
  import { Heading } from "../../index.ts";
  import { currentHeadingOffset, scopeHeadings } from "../../../infra/heading-context.ts";
  let { node, onevent, bodyOnly = false }: { node: ResolvedNodeFor<"catalog.home">; onevent: (event: NodeEvent) => void; bodyOnly?: boolean } = $props();
  const id = $props.id();
  // This composition has rails but no page heading of its own.
  if (currentHeadingOffset() > 0) scopeHeadings(-1);
</script>

<div data-catalog-home>
  {#if !bodyOnly}<section data-place-stack="featured" aria-label={node.featured.eyebrow}><NodeRenderer node={node.featured} {onevent} /></section>{/if}
  {#each node.groups as group, index (group.id)}
    <section data-catalog-group data-place-stack={group.id} aria-labelledby={`${id}-group-${index}`}>
      <Heading kind="rail-title" id={`${id}-group-${index}`} text={group.title} />
      <div data-catalog-rail data-public-rail={group.title}>
        {#each group.items as item (item.record)}<NodeRenderer node={item} {onevent} />{/each}
      </div>
    </section>
  {/each}
</div>
