<script lang="ts">
  import type { FactsContent, FrameContent } from "../../../../interaction/surface-frame.ts";
  import { readingFields } from "../../../../interaction/fact-presentation.ts";
  import { FactRow } from "../../index.ts";
  import { ObjectStateRow } from "../../index.ts";
  import { StackLayout } from "../../index.ts";
  let { fields, facts, object, labels, references = {}, selectors = [], onselect }: {
    fields: FactsContent['fields']; facts: FactsContent['facts']; object: string; labels: FactsContent['labels'];
    references?: FactsContent['references'];
    selectors?: NonNullable<Extract<FrameContent, { kind: "context" }>["selectors"]>;
    onselect?: (journey: string) => void;
  } = $props();
  const visible = $derived(readingFields(fields, facts));
</script>
{#if visible.length || (selectors.length && onselect)}
  <StackLayout title="Properties">
    <dl class="bank-stack" data-material="pane" data-composition="context-properties">
      {#each visible as field}
        <FactRow label={labels[`${object}.${field}`]!} value={Object.hasOwn(facts, field) ? facts[field] : undefined} references={references[field]} />
      {/each}
      {#if onselect}{#each selectors as selector}<ObjectStateRow {selector} {onselect}/>{/each}{/if}
    </dl>
  </StackLayout>
{/if}
