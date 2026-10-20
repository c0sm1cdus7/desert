<script lang="ts">
  import { useSidebar } from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import Image from '../pieces/media/Image.svelte';
  import { mediaSource } from '../pieces/media/source.ts';
  let { asset, scrollTop }: { asset?: string; scrollTop: number } = $props();
  const sidebar = useSidebar();
</script>

{#if asset && sidebar.open && sidebar.presentation === "docked"}
  <!-- Content extends through the floating pane's outer inset too. The pane
       supplies glass; the image is not cut to the pane's rounded silhouette. -->
  <div data-catalog-underlay aria-hidden="true">
    <div data-catalog-background-extension style:top={`${-scrollTop}px`}>
      <Image source={mediaSource(asset)} alt="" edge={1280} />
    </div>
  </div>
{/if}
