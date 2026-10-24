<script lang="ts">
  import * as Empty from "../../../vendor/components/ui/empty/index.js";
  import { Skeleton } from "../../../vendor/components/ui/skeleton/index.js";
  import { GroupedPanel } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { loaded, createLabel, connection }: CatalogProps<"collection-state"> = $props();
  let offline = $derived(connection === 'offline');
  let pending = $derived(!loaded && !offline);
</script>
<GroupedPanel><div role="group" aria-label="Collection state" aria-busy={pending}
  data-collection-state={offline ? 'offline' : loaded ? 'empty' : 'loading'}><Empty.Root>
  {#if pending}
    <div class="flex w-full flex-col gap-2" aria-hidden="true">
      <Skeleton line="primary" />
      <Skeleton line="secondary" />
    </div>
    <span class="sr-only" role="status">Loading content…</span>
  {:else}
  <Empty.Header>
    <Empty.Title role="heading" aria-level={2}>{offline ? 'Controller unavailable.' : 'Nothing here yet.'}</Empty.Title>
    {#if offline || createLabel}<Empty.Description>{offline ? 'Reconnect to load this content.' : `Use “${createLabel}” to get started.`}</Empty.Description>{/if}
  </Empty.Header>
  {/if}
</Empty.Root></div></GroupedPanel>
