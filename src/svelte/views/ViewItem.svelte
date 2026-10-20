<script lang="ts">
  import type { ViewItem } from "../../views/schema.ts";
  import type { ResolvedView } from "../../views/resolved.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { controlBankNode } from "../../interaction/bank-node.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import Information from "../pieces/Information.svelte";
  import StackItem from "../pieces/StackItem.svelte";
  let { item, resolved, onevent }: {
    item: ViewItem; resolved: ResolvedView; onevent: (event: BankEvent) => void;
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
    if (!node || node.kind !== item.kind) throw new Error("INVALID_VIEW_INPUT_BINDING");
    return node;
  }
</script>

{#if item.kind === "text"}
  <div data-stack-item data-stack-placement="content"><Information items={[item]} /></div>
{:else if item.kind === "fact"}
  <Information items={[item]} />
{:else if item.kind === "tag" || item.kind === "image" || item.kind === "avatar"}
  {@const node = controlBankNode(item)}
  <StackItem kind={node.kind}><BankRenderer {node} /></StackItem>
{:else}
  {@const node = binding()}
  <StackItem kind={node.kind}><BankRenderer {node} onevent={dispatch} /></StackItem>
{/if}
