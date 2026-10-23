<script lang="ts">
  import type { ResolvedView } from "../../../../views/resolved.ts";
  import type { BankEvent } from "../../../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../../../interaction/catalog.ts";
  import { ContentFlow } from "../../../adapter-catalog.ts";
  import type { RegisterContentActions } from "../../../infra/workspace-content.ts";
  let { resolved, onevent, album = null, onalbum, onactions }: {
    resolved: ResolvedView;
    onevent: (event: BankEvent) => void;
    album?: string | null;
    onalbum: (id: string) => void;
    onactions?: RegisterContentActions;
  } = $props();
  let flow = $state<{
    revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null>;
    revealAndFocusEntry: (id: PrimitiveId) => Promise<void>;
    selectMedia: (record: string) => boolean;
  } | null>(null);
  export async function revealEntry(id: PrimitiveId) { return await flow?.revealEntry(id) ?? null; }
  export function selectMedia(record: string) { return flow?.selectMedia(record) ?? false; }
  $effect(() => {
    const register = onactions;
    register?.({ revealEntry: async id => { await flow?.revealAndFocusEntry(id); }, selectMedia });
    return () => register?.(null);
  });
</script>

<ContentFlow {resolved} {onevent} {album} {onalbum} bind:this={flow} />
