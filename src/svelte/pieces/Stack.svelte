<script lang="ts">
  import type { Stack } from "../../interaction/place.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { LocalFileHost } from "../controls/file-host.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import StackLayout from "./StackLayout.svelte";
  import StackItem from "./StackItem.svelte";
  import { provideStackTitle } from "./stack-context.ts";
  import { optionsInputRequired } from "../../interaction/extended-controls.ts";
  let { definition, onevent, host }: {
    definition: Stack; onevent: (event: BankEvent) => void; host?: LocalFileHost;
  } = $props();
  provideStackTitle(() => definition.title);
  // A deduplicated legend retains the same semantic law as its standalone owner.
  let required = $derived(definition.items.some(item => item.kind === "control.options"
    && item.control.label === definition.title && optionsInputRequired(item.control)));
</script>

<section data-place-stack={definition.id}>
  <StackLayout title={definition.title} description={definition.description} {required}>
    {#each definition.items as item, index (index)}
      <StackItem kind={item.kind}>
        <BankRenderer node={item} {onevent} {host} />
      </StackItem>
    {/each}
  </StackLayout>
</section>
