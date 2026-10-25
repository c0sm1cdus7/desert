<script lang="ts">
  import { NodeRenderer, StackItem, StackLayout, ViewRegion } from "../../index.ts";
  import { stackPlacement } from "../../../infra/stack-placement.ts";
  import { provideStackTitle } from "../../../infra/stack-context.ts";
  import { useFileHost } from "../../../infra/file-host-context.ts";
  import { optionsInputRequired } from "../../../../interaction/extended-controls.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { definition, onevent }: CatalogProps<"stack"> = $props();
  provideStackTitle(() => definition.title);
  // The place's file host travels by context, never through this stack's contract.
  const host = useFileHost();
  // A deduplicated legend retains the same semantic law as its standalone owner.
  let required = $derived(definition.items.some(item => item.kind === "control.options"
    && item.control.label === definition.title && optionsInputRequired(item.control)));
</script>

<!-- The stack's region, `definition.id`: navigation reveals it by that identity. -->
<ViewRegion kind="item" id={definition.id}>
  <StackLayout title={definition.title} description={definition.description} {required}>
    {#each definition.items as item, index (index)}
      <StackItem placement={stackPlacement(item.kind)} kind={item.kind}>
        <!-- lane-merge: node-renderer reads the file host from context (useFileHost) and leaves its contract. -->
        <NodeRenderer node={item} onevent={event => onevent?.(event)} {host} />
      </StackItem>
    {/each}
  </StackLayout>
</ViewRegion>
