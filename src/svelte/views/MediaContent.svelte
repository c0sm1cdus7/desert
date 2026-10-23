<script lang="ts">
  import type { MediaLibrary as LibraryData } from "../../views/media-library.ts";
  import { MediaLibrary } from "../adapter-catalog.ts";
  let { library, album, onalbum }: {
    library: LibraryData; album: string | null; onalbum: (id: string) => void;
  } = $props();
  let content = $state<{ select: (record: string) => boolean }>();
  export function select(record: string) { return content?.select(record) ?? false; }
</script>

<MediaLibrary {library} {album} {onalbum} bind:this={content} />
