<script lang="ts">
  import * as Avatar from "../../../vendor/components/ui/avatar/index.js";
  import { Badge } from "../../../vendor/components/ui/badge/index.js";
  import { cn } from "../../../vendor/utils.js";
  import ImageOff from "@lucide/svelte/icons/image-off";
  import type { AvatarNode, ImageNode, TagNode } from "../../../../interaction/extended-nodes.ts";
  import { PhotoCollection } from '../../index.ts';
  import { Image } from '../../index.ts';
  import { imageIdentity } from '../../../infra/media-source.ts';
  let { node }: { node: AvatarNode | ImageNode | TagNode } = $props();
  let source = $derived(node.kind === "tag" ? null : typeof node.source === "object" && node.source !== null
    ? 'asset' in node.source ? `/media/${encodeURIComponent(node.source.asset)}` : node.source : node.source);
  const aspects = { square: "aspect-square", landscape: "aspect-video", portrait: "aspect-[3/4]" };
</script>
{#if node.kind === "tag"}
  <Badge variant={node.tone === "neutral" ? "secondary" : node.tone} data-control="tag" data-tone={node.tone}>{node.label}</Badge>
{:else if node.kind === "avatar"}
  <div class="flex min-w-0 items-center gap-3" data-control="avatar">
    <Avatar.Root size="lg" aria-hidden="true">
      {#if source}<Image {source} alt="" edge={160} fallback={node.fallback} />
      {:else}<Avatar.Fallback initials={node.fallback} />{/if}
    </Avatar.Root><span class="min-w-0 [overflow-wrap:anywhere]">{node.label}</span>
  </div>
{:else}
  <figure data-control="image" class="flex min-w-0 flex-col gap-2">
    <div class={cn("relative w-full overflow-hidden rounded-xl", aspects[node.aspect])} data-aspect={node.aspect}>
      {#if source}
        <div class="absolute inset-0">{#key imageIdentity(source)}<PhotoCollection photos={[{source,alt:node.alt}]} title={node.label} />{/key}</div>
      {:else}<div class="absolute inset-0 flex items-center justify-center gap-3 rounded-xl border" role="img" aria-label={node.alt}>
        <ImageOff aria-hidden="true" /><span>Image unavailable</span></div>{/if}
    </div>
    <figcaption>{node.label}</figcaption>
  </figure>
{/if}
