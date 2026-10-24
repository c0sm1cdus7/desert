<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { controlResolvedNode } from "../../../../interaction/resolved-node.ts";
  import { NodeRenderer, Information, StackItem, TextContent, MessageBody, ViewDestinationLink, SummaryWidget } from "../../../adapter-catalog.ts";
  let { item, resolved, onevent, host = "flow" }: CatalogProps<"view-item"> = $props();
  function dispatch(event: NodeEvent) {
    if (item.kind === "collection" && event.kind === "collection.select") {
      if (!resolved.disabledOutputs.includes(item.output)) onevent?.({ kind: "surface.invoke", intent: {
        kind: "view.output", view: resolved.view.id, output: item.output, recordId: event.id,
      } });
    } else onevent?.(event);
  }
  function binding() {
    if (!("input" in item)) throw new Error("VIEW_INPUT_REQUIRED");
    const node = resolved.bindings[item.input];
    if ((!node && !resolved.pending?.[item.input]) || node && node.kind !== item.kind) throw new Error("INVALID_VIEW_INPUT_BINDING");
    return node;
  }
</script>

{#if item.kind === "text"}
  <TextContent text={item.text} />
{:else if item.kind === "fact"}
  <Information items={[item]} />
{:else if item.kind === "destination-link"}
  <ViewDestinationLink view={resolved.view.id} output={item.output} label={item.label} icon={item.icon}
    reason={resolved.disabledOutputs.includes(item.output) ? resolved.connection?.label : undefined}
    available={!resolved.disabledOutputs.includes(item.output)} {onevent} />
{:else if item.kind === "tag" || item.kind === "image" || item.kind === "avatar"}
  {@const node = controlResolvedNode(item)}
  <StackItem kind={node.kind}><NodeRenderer {node} /></StackItem>
{:else if item.kind==='collection' && item.presentation?.kind==='summary-widget'}
  {@const node=binding()}
  {#if node?.kind==='collection'}<SummaryWidget {node} available={!resolved.disabledOutputs.includes(item.output)}
    activate={()=>onevent?.({kind:'surface.invoke',intent:{kind:'view.output',view:resolved.view.id,output:item.output}})} />{/if}
{:else}
  {@const node = binding()}
  {#if !node && "input" in item && resolved.pending?.[item.input]}
    <MessageBody content={resolved.pending[item.input]} />
  {:else if node}
    {#if host === "frame"}<NodeRenderer {node} onevent={dispatch} />
    {:else}<StackItem kind={node.kind}><NodeRenderer {node} onevent={dispatch} /></StackItem>{/if}
  {/if}
{/if}
