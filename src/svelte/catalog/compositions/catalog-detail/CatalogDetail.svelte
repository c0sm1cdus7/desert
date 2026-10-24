<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Heading } from "../../index.ts";
  import { StackLayout } from "../../index.ts";
  import { PhotoCollection } from '../../index.ts';
  import { catalogPhotos } from '../../../infra/media-source.ts';
  let { node, bodyOnly = false }: CatalogProps<"catalog-detail"> = $props();
</script>

<article data-catalog-detail data-record={node.record}>
  {#if !bodyOnly}
  <section data-place-stack="photograph" aria-label={node.title}><div data-catalog-detail-image>
    {#key node.record}<PhotoCollection photos={catalogPhotos(node.gallery ?? [node.image])} title={node.title} />{/key}
  </div></section>
  {/if}
  <div data-catalog-prose>
    {#if !bodyOnly}<Heading kind="page" text={node.title} focusTarget />{/if}
    <section data-place-stack="about">
      <StackLayout title="About"><div data-stack-item><p>{node.description}</p></div></StackLayout>
    </section>
  </div>
</article>
