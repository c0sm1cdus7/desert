<script lang="ts">
  import type { BankNodeFor } from "../../../../interaction/bank-node.ts";
  import type { BankEvent } from "../../../../interaction/bank-events.ts";
  import Heading from "../../foundations/heading/Heading.svelte";
  import StackLayout from "../../foundations/stack-layout/StackLayout.svelte";
  import PhotoCollection from '../photo-collection/PhotoCollection.svelte';
  import { catalogPhotos } from '../../../infra/media-source.ts';
  let { node, bodyOnly = false }: { node: BankNodeFor<"catalog.detail">; onevent: (event: BankEvent) => void; bodyOnly?: boolean } = $props();
</script>

<article data-catalog-detail data-record={node.record}>
  {#if !bodyOnly}
  <section data-place-stack="photograph" aria-label={node.title}><div data-catalog-detail-image>
    {#key node.record}<PhotoCollection photos={catalogPhotos(node.gallery ?? [node.image])} title={node.title} />{/key}
  </div></section>
  {/if}
  <div data-catalog-prose>
    {#if !bodyOnly}<Heading kind="document-title" text={node.title} />{/if}
    <section data-place-stack="about">
      <StackLayout title="About"><div data-stack-item><p>{node.description}</p></div></StackLayout>
    </section>
  </div>
</article>
