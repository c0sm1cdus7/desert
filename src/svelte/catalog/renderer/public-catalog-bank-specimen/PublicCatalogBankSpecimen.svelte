<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import type { BankNode } from "../../../../interaction/bank-node.ts";
  import type { BankEvent } from "../../../../interaction/bank-events.ts";
  import { BankRenderer, Feedback } from "../../../adapter-catalog.ts";
  import { catalogSpecimen } from "./catalog-specimen.svelte.ts";
  let { initial, oncatalog }: { initial: BankNode; oncatalog: (event: BankEvent) => void } = $props();
  const specimen = untrack(() => catalogSpecimen(initial, event => oncatalog(event)));
  onDestroy(specimen.dispose);
</script>

{#if specimen.node.kind === "transient" || specimen.node.kind === "problem"}
  <BankRenderer node={specimen.opener} onevent={specimen.interact} />
{/if}
<BankRenderer node={specimen.node} onevent={specimen.interact} />
{#if specimen.notice}<Feedback text={specimen.notice} />{/if}
