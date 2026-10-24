<script lang="ts">
  import * as Card from "@desert/svelte/vendor/components/ui/card/index.js";
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  import { getContext } from 'svelte';
  import { Image } from '../../index.ts';
  import { mediaSource, prefetchImage } from '../../../infra/media-source.ts';
  import { useFocusScope } from '../../../infra/focus-scope.ts';
  let { node, onevent }: CatalogProps<"catalog-card"> = $props();
  const cover = getContext<((record:string)=>string | undefined) | undefined>('catalog-photo-intent');
  function prepare() {
    const asset = cover?.(node.record); if (asset) prefetchImage(mediaSource(asset), window.innerWidth*window.devicePixelRatio);
  }
  const open = () => onevent?.({ kind: "catalog.open", record: node.record });
  // The card answers to `catalog-return:<record>` in the nearest focus scope, so what it opened can return focus to it.
  const scope = useFocusScope();
  let action = $state<HTMLElement | null>(null);
  $effect(() => {
    const target = action, key = `catalog-return:${node.record}`;
    if (!scope || !target) return;
    return scope.register(key, () => { target.focus({ preventScroll: true }); return document.activeElement === target; });
  });
</script>

  <Card.Root data-catalog-card="item" data-record={node.record} data-public-card={node.record}>
    {#if node.image}<Image source={mediaSource(node.image.asset)} alt={node.image.alt} />
    {:else if 'mediaType' in node}<Image placeholder={node.mediaType} />{/if}
    <Card.Header><Card.Title>
      <Button bind:ref={action} variant="row" data-catalog-image-action aria-label={node.title} onclick={open} onpointerenter={prepare} onfocus={prepare}>
        <span data-catalog-card-overlay data-catalog-item-title data-public-card-title>{node.title}</span>
      </Button>
    </Card.Title></Card.Header>
  </Card.Root>
