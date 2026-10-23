<script lang="ts">
  import type { ViewItem } from "../../views/schema.ts";
  import type { ResolvedView } from "../../views/resolved.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { controlBankNode } from "../../interaction/bank-node.ts";
  import { BankRenderer, Information, StackItem, TextContent, MessageBody, ViewDestinationLink, SummaryWidget } from "../adapter-catalog.ts";
  let { item, resolved, onevent, host = "flow" }: {
    item: ViewItem; resolved: ResolvedView; onevent: (event: BankEvent) => void; host?: "flow" | "frame";
  } = $props();
  function dispatch(event: BankEvent) {
    if (item.kind === "collection" && event.kind === "collection.select") {
      if (!resolved.disabledOutputs.includes(item.output)) onevent({ kind: "surface.invoke", intent: {
        kind: "view.output", view: resolved.view.id, output: item.output, recordId: event.id,
      } });
    } else onevent(event);
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
  {@const node = controlBankNode(item)}
  <StackItem kind={node.kind}><BankRenderer {node} /></StackItem>
{:else if item.kind==='collection' && item.presentation?.kind==='summary-widget'}
  {@const node=binding()}
  {#if node?.kind==='collection'}<SummaryWidget {node} available={!resolved.disabledOutputs.includes(item.output)}
    activate={()=>onevent({kind:'surface.invoke',intent:{kind:'view.output',view:resolved.view.id,output:item.output}})} />{/if}
{:else}
  {@const node = binding()}
  {#if !node && "input" in item && resolved.pending?.[item.input]}
    <MessageBody content={resolved.pending[item.input]} />
  {:else if node}
    {#if host === "frame"}<BankRenderer {node} onevent={dispatch} />
    {:else}<StackItem kind={node.kind}><BankRenderer {node} onevent={dispatch} /></StackItem>{/if}
  {/if}
{/if}
