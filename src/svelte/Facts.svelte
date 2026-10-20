<script lang="ts">
  import FactValue from "./pieces/FactValue.svelte";
  import type { FactsContent } from "../interaction/surface-frame.ts";
  let { fields, facts, object, labels, multiline = [] }: Omit<FactsContent, "kind"> = $props();
</script>

<dl class="bank-stack" data-material={fields.length > 0 && fields.every(field => multiline.includes(field)) ? 'interior' : 'pane'} data-prose-only={fields.length > 0 && fields.every(field => multiline.includes(field))}>
  {#each fields as field}
    <div class="fact-row" data-primitive="fact" data-multiline={multiline.includes(field)}><dt class="fact-label type-support">{labels[`${object}.${field}`]}</dt>
      <dd class="fact-value" data-reading={multiline.includes(field) ? "multiline" : "scalar"}><FactValue value={Object.hasOwn(facts, field) ? facts[field] : undefined} /></dd></div>
  {/each}
</dl>
