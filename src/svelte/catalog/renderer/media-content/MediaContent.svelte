<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Library } from "../../index.ts";
  let { library, album, onalbum }: CatalogProps<"media-content"> = $props();
  let content = $state<{ select: (record: string) => boolean }>();
  export function select(record: string) { return content?.select(record) ?? false; }
</script>

<Library {library} {album} {onalbum} bind:this={content} />
