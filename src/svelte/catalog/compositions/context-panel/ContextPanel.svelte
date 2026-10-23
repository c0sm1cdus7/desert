<script lang="ts">
  import NodeRenderer from "../../renderer/node-renderer/NodeRenderer.svelte";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import DestinationRow from "../../foundations/destination-row/DestinationRow.svelte";
  import GroupedPanel from "../../foundations/grouped-panel/GroupedPanel.svelte";
  import ReadingContent from "../reading-content/ReadingContent.svelte";
  import ContextProperties from "../context-properties/ContextProperties.svelte";
  import MediaObject from "../media-object/MediaObject.svelte";
  import AttentionStatus from '../attention-status/AttentionStatus.svelte';
  import type { NodeRendererInputs } from "../../../renderer-contracts.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {}, actions, selectors = [], attention=[],presentation, onselect }: NodeRendererInputs["context"] = $props();
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
