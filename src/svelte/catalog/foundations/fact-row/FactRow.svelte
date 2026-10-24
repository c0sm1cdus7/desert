<script lang="ts">
  import { FactValue } from "../../index.ts";
  import { NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { ReferenceValues } from '../../index.ts';
  import type { CatalogProps } from "../../types.d.ts";
  import { displayLabel } from '../../../../interaction/display-label.ts';
  let { label, value, references }: CatalogProps<"fact-row"> = $props();
  const id = $props.id();
</script>
<div class="fact-row" data-primitive="fact">
  <dt class="fact-label type-support">{displayLabel(label)}</dt>
  <dd class="fact-value type-body">
    {#if Array.isArray(value) && references}<ReferenceValues values={value} options={references}/>
    {:else if Array.isArray(value)}
      {#if value.length}<div class="fact-labels">
        {#each value as text, index}
          <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.tag", control: {
            version: "desert.control/1", kind: "tag", id: `${id}:${index}`, label: text,
            disabled: false, tone: "neutral",
          } }} />
        {/each}
      </div>{:else}<FactValue value="" />{/if}
    {:else}<FactValue value={typeof value === "object" ? undefined : value} />{/if}
  </dd>
</div>
