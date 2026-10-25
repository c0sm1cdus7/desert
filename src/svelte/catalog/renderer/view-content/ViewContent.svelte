<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { ContentFlow } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { resolved, onevent, album = null, onalbum, onactions }: CatalogProps<"view-content"> = $props();
  let flow = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<boolean>; revealAndFocusEntry: (id: ResolvedNodeId) => Promise<boolean>;
    selectMedia: (record: string) => boolean }>();
  export async function revealEntry(id: ResolvedNodeId): Promise<boolean> { return await flow?.revealEntry(id) ?? false; }
  export function selectMedia(record: string): boolean { return flow?.selectMedia(record) ?? false; }
  // The workspace reaches a retained view's bank and library through what it registers here (null once it unmounts).
  $effect(() => {
    const register = onactions;
    register?.({ revealEntry: async id => { await flow?.revealAndFocusEntry(id); }, selectMedia });
    return () => register?.(null);
  });
</script>

<ContentFlow {resolved} {onevent} {album} {onalbum} bind:this={flow} />
