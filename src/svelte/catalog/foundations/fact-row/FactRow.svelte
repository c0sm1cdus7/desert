<script lang="ts">
  import type { FactValue as Value } from "../../../../fact-values.ts";
  import FactValue from "../fact-value/FactValue.svelte";
  import BankRenderer from "../../renderer/bank-renderer/BankRenderer.svelte";
  import { BankVersion } from "../../../../interaction/bank-node.ts";
  import ReferenceValues from '../reference-values/ReferenceValues.svelte';
  import type { ReferenceState } from '../../../../interaction/labels-control.ts';
  import { displayLabel } from '../../../../interaction/display-label.ts';
  let { label, value, references }: { label: string; value: Value | null | undefined; references?:ReferenceState['options']|undefined } = $props();
  const id = $props.id();
</script>
<div class="fact-row" data-primitive="fact">
  <dt class="fact-label type-support">{displayLabel(label)}</dt>
  <dd class="fact-value type-body">
    {#if Array.isArray(value) && references}<ReferenceValues values={value} options={references}/>
    {:else if Array.isArray(value)}
      {#if value.length}<div class="fact-labels">
        {#each value as text, index}
          <BankRenderer node={{ version: BankVersion, kind: "control.tag", control: {
            version: "desert.control/1", kind: "tag", id: `${id}:${index}`, label: text,
            disabled: false, tone: "neutral",
          } }} />
        {/each}
      </div>{:else}<FactValue value="" />{/if}
    {:else}<FactValue value={typeof value === "object" ? undefined : value} />{/if}
  </dd>
</div>
