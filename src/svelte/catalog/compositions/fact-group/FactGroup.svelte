<script lang="ts">
  import { FactRow } from "../../index.ts";
  import { NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {} }: CatalogProps<"fact-group"> = $props();
  const textual = $derived(fields.filter(field => !images.includes(field)));
</script>

{#each fields.filter(field => images.includes(field)) as field}
  {@const value = facts[field]}
  {#if typeof value === 'object' && value !== null && 'kind' in value && value.kind === 'asset'}
    <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.image", control: {
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
