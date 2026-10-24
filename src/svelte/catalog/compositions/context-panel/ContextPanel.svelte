<script lang="ts">
  import { AttentionStatus, Column, ContextProperties, List, MediaObject, NodeRenderer, ReadingContent, Row, Spacer, StackLayout } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {}, actions, selectors = [], attention=[],presentation, onselect }: CatalogProps<"context-panel"> = $props();
  let remaining = $derived(fields.filter(field => field !== presentation?.media && field !== presentation?.description));
  let prose = $derived(remaining.filter(field => multiline.includes(field)));
  let metadata = $derived(remaining.filter(field => !multiline.includes(field)));
  let imageFields = $derived(metadata.filter(field => images.includes(field)));
  let properties = $derived(metadata.filter(field => !images.includes(field)));
</script>
<Column gap="relaxed">
    <AttentionStatus signals={attention} />
    {#if presentation}<MediaObject {facts} {presentation} />{/if}
    {#if prose.length}<ReadingContent fields={prose} {facts} {object} {labels} />{/if}
    {#if imageFields.length}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details: { kind: "facts", fields: imageFields, facts, object, labels, images: imageFields } }} />
    {/if}
    <ContextProperties fields={properties} {facts} {object} {labels} {references} {selectors} {onselect}/>
    {#if actions.length}
      <!-- The empty track keeps one more gap before the actions, which sets them apart from what the object reads. -->
      <Spacer size="fill" />
      <StackLayout title={say(m.contextPanel.actions)}>
        <List kind="rows" measure="reading">
          {#each actions as action (action.id)}
            <Row label={action.label} leading={{ kind: "face", face: { kind: "icon", icon: "open" } }} trailing="chevron" interaction="open"
              available={action.available} current={false} onopen={action.invoke} />
          {/each}
        </List>
      </StackLayout>
    {/if}
</Column>
