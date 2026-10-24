<script lang="ts">
  import { FactValue, Tag } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { displayLabel } from '../../../../interaction/display-label.ts';
  let { kind = "value", label, value, references, control }: CatalogProps<"fact-row"> = $props();
</script>
<div class="fact-row" class:fact-row-control={kind === "control"} data-primitive="fact" data-fact-kind={kind}>
  <dt class="fact-label type-support">{displayLabel(label)}</dt>
  <dd class="fact-value type-body">
    {#if kind === "control"}{@render control?.()}
    <!-- A list value reads as named references (each beside its color bullet) or as neutral tags. -->
    {:else if Array.isArray(value) && references}<span class="fact-references">
      {#each value as reference (reference)}
        {@const option = references.find(item => item.value === reference)}
        {#if option}<Tag label={option.label} color={option.color} state="known" presentation="text" removable={false} disabled={false} />
        {:else}<Tag label="Unavailable" state="unavailable" presentation="text" removable={false} disabled={false} />{/if}
      {/each}
    </span>
    {:else if Array.isArray(value)}
      {#if value.length}<div class="fact-labels">
        {#each value as text, index (index)}<Tag label={text} state="known" presentation="chip" tone="neutral" removable={false} disabled={false} />{/each}
      </div>{:else}<FactValue value="" />{/if}
    {:else}<FactValue value={typeof value === "object" ? undefined : value} />{/if}
  </dd>
</div>

<style>
  /* One label and its value in a definition list: label left, value right-aligned, a hairline under every row but the last. */
  @layer components {
    .fact-row { min-height:2.75rem; padding:.75rem 1rem; display:grid; grid-template-columns:minmax(0,1fr) minmax(0,2fr); gap:1rem; align-items:baseline; border-bottom:1px solid var(--separator); }
    .fact-row:last-child { border:0; }
    .fact-row-control { align-items:center; }
    .fact-label { min-width:0; color:var(--muted-foreground); overflow-wrap:anywhere; text-wrap:balance; }
    .fact-value { min-width:0; white-space:pre-wrap; overflow-wrap:anywhere; text-align:end; text-wrap:balance; justify-content:flex-end; }
    .fact-labels { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:.5rem; }
    .fact-references { display:flex; flex-wrap:wrap; gap:.35em .8em; justify-content:inherit; min-width:0; }
    @container fact-group (max-width:14em) {
      .fact-row { grid-template-columns:minmax(0,1fr); gap:.25rem; }
    }
  }
</style>
