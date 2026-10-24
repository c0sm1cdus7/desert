<script lang="ts">
  import { List, Loading, Status } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { loaded, createLabel, connection }: CatalogProps<"collection-state"> = $props();
  let offline = $derived(connection === 'offline');
  let pending = $derived(!loaded && !offline);
</script>
<List kind="rows" measure="reading" label={say(m.collectionState.label)} busy={pending}>
  {#if pending}<Loading kind="lines" inset="block" label={say(m.collectionState.loading)} />
  {:else if offline}<Status tone="offline" size="regular" heading title={say(m.collectionState.offlineTitle)}
    description={say(m.collectionState.offlineDescription)} />
  {:else}<Status tone="neutral" size="regular" heading title={say(m.collectionState.emptyTitle)}
    description={createLabel ? say(m.collectionState.emptyDescription, { command: createLabel }) : undefined} />{/if}
</List>
