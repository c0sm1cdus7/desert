<script lang="ts">
  import type { Stack } from "../../../../interaction/place.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import type { LocalFileHost } from "../../../infra/file-host.ts";
  import { NodeRenderer } from "../../index.ts";
  import { StackLayout } from "../../index.ts";
  import { StackItem } from "../../index.ts";
  import { stackPlacement } from "../../../infra/stack-placement.ts";
  import { provideStackTitle } from "../../../infra/stack-context.ts";
  import { optionsInputRequired } from "../../../../interaction/extended-controls.ts";
  let { definition, onevent, host }: {
    definition: Stack; onevent: (event: NodeEvent) => void; host?: LocalFileHost;
  } = $props();
  provideStackTitle(() => definition.title);
  // A deduplicated legend retains the same semantic law as its standalone owner.
  let required = $derived(definition.items.some(item => item.kind === "control.options"
    && item.control.label === definition.title && optionsInputRequired(item.control)));
</script>

<section data-place-stack={definition.id}>
  <StackLayout title={definition.title} description={definition.description} {required}>
    {#each definition.items as item, index (index)}
      <StackItem placement={stackPlacement(item.kind)} kind={item.kind}>
        <NodeRenderer node={item} {onevent} {host} />
      </StackItem>
    {/each}
  </StackLayout>
</section>
