<script lang="ts">
  import { NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { DestinationRow } from "../../index.ts";
  import { GroupedPanel } from "../../index.ts";
  import { ReadingContent } from "../../index.ts";
  import { ContextProperties } from "../../index.ts";
  import { MediaObject } from "../../index.ts";
  import { AttentionStatus } from '../../index.ts';
  import type { CatalogProps } from "../../types.d.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {}, actions, selectors = [], attention=[],presentation, onselect }: CatalogProps<"context-panel"> = $props();
  let remaining = $derived(fields.filter(field => field !== presentation?.media && field !== presentation?.description));
  let prose = $derived(remaining.filter(field => multiline.includes(field)));
  let metadata = $derived(remaining.filter(field => !multiline.includes(field)));
  let imageFields = $derived(metadata.filter(field => images.includes(field)));
  let properties = $derived(metadata.filter(field => !images.includes(field)));
</script>
<div data-composition="context">
    <AttentionStatus signals={attention} />
    {#if presentation}<MediaObject {facts} {presentation} />{/if}
    {#if prose.length}<ReadingContent fields={prose} {facts} {object} {labels} />{/if}
    {#if imageFields.length}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details: { kind: "facts", fields: imageFields, facts, object, labels, images: imageFields } }} />
    {/if}
    <ContextProperties fields={properties} {facts} {object} {labels} {references} {selectors} {onselect}/>
    {#if actions.length}<section class="context-actions" aria-label="Actions">
      <h3>Actions</h3>
      <GroupedPanel><div data-grouped-rows>
        {#each actions as action (action.id)}
          <DestinationRow destination={action.id} label={action.label} open={action.invoke} available={action.available} />
        {/each}
      </div></GroupedPanel>
    </section>{/if}
</div>
