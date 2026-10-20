<script lang="ts">
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import DestinationRow from "./pieces/DestinationRow.svelte";
  import GroupedPanel from "./pieces/GroupedPanel.svelte";
  import type { WebRendererProps } from "./renderer-contracts.ts";
  let { fields, facts, object, labels, multiline = [], actions }: WebRendererProps["context"] = $props();
  let prose = $derived(fields.filter(field => multiline.includes(field)));
  let metadata = $derived(fields.filter(field => !multiline.includes(field)));
</script>
<div data-composition="context">
    {#if prose.length}<BankRenderer node={{ version: BankVersion, kind: "fact", details: { kind: "facts", fields: prose, facts, object, labels, multiline } }} />{/if}
    {#if metadata.length}
      <BankRenderer node={{ version: BankVersion, kind: "fact", details: { kind: "facts", fields: metadata, facts, object, labels } }} />
    {/if}
    {#if actions.length}<section class="context-actions" aria-label="Actions">
      <h3>Actions</h3>
      <GroupedPanel><div data-grouped-rows>
        {#each actions as action (action.id)}
          <DestinationRow destination={action.id} label={action.label} open={action.invoke} available={action.available} />
        {/each}
      </div></GroupedPanel>
    </section>{/if}
</div>
