<script lang="ts">
  import { getContext } from "svelte";
  import { Card } from "../../index.ts";
  import { mediaSource } from "../../../infra/media-source.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { node, onevent }: CatalogProps<"catalog-card"> = $props();
  // The larger photograph the detail opens with, warmed when the person points at or focuses the card.
  const cover = getContext<((record: string) => string | undefined) | undefined>("catalog-photo-intent");
  let photo = $derived(cover?.(node.record));
</script>
<Card presentation={node.presentation} label={node.title} title={node.title}
  artwork={node.image ? mediaSource(node.image.asset) : "mediaType" in node ? { kind: "placeholder", media: node.mediaType } : undefined}
  alt={node.image?.alt} prefetch={photo ? mediaSource(photo) : undefined} attention={false} current={false} disabled={false}
  focusKey={`catalog-return:${node.record}`} onopen={() => onevent?.({ kind: "catalog.open", record: node.record })} />
