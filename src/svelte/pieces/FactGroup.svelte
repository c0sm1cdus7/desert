<script lang="ts">
  import FactRow from "./FactRow.svelte";
  import BankRenderer from "../BankRenderer.svelte";
  import { BankVersion } from "../../interaction/bank-node.ts";
  import type { FactsContent } from "../../interaction/surface-frame.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {} }: Omit<FactsContent, "kind"> = $props();
  const textual = $derived(fields.filter(field => !images.includes(field)));
</script>

{#each fields.filter(field => images.includes(field)) as field}
  {@const value = facts[field]}
  {#if typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'asset'}
    <BankRenderer node={{ version: BankVersion, kind: "control.image", control: {
      version: "desert.control/1", kind: "image", id: `fact:${object}:${field}`,
      label: labels[`${object}.${field}`]!, alt: labels[`${object}.${field}`]!,
      disabled: false, source: value, aspect: "landscape",
    } }} />
  {/if}
{/each}
{#if textual.length || fields.length === 0}
<dl class="bank-stack" data-material="pane">
  {#each textual as field}
    {@const value = facts[field]}
    <FactRow label={labels[`${object}.${field}`]!} value={Object.hasOwn(facts, field) ? value : undefined} references={references[field]} />
  {/each}
</dl>
{/if}
