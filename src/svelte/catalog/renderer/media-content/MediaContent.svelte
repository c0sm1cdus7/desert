<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { MediaLibrary } from "../../../adapter-catalog.ts";
  let { library, album, onalbum }: CatalogProps<"media-content"> = $props();
  let content = $state<{ select: (record: string) => boolean }>();
  export function select(record: string) { return content?.select(record) ?? false; }
</script>

<MediaLibrary {library} {album} {onalbum} bind:this={content} />
