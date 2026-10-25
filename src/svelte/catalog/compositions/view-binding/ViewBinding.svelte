<script lang="ts">
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { controlResolvedNode } from "../../../../interaction/resolved-node.ts";
  import { stackPlacement } from "../../../infra/stack-placement.ts";
  import { NodeRenderer, StackItem, SummaryWidget, Text } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { item, resolved, onevent, host = "flow" }: CatalogProps<"view-binding"> = $props();
  /** What the item shows: its own control node (a tag, image or avatar), the summary of its bound collection, its bound node,
   * the message of an input still pending, or nothing yet. A binding of another kind than the item fails loudly. */
  let bound = $derived.by(() => {
    if (item.kind === "tag" || item.kind === "image" || item.kind === "avatar") return { kind: "control", node: controlResolvedNode(item) } as const;
    const node = resolved.bindings[item.input], pending = resolved.pending?.[item.input];
    if ((!node && !pending) || node && node.kind !== item.kind) throw new Error("INVALID_VIEW_INPUT_BINDING");
    if (item.kind === "collection" && item.presentation?.kind === "summary-widget") {
      return node?.kind === "collection" ? { kind: "summary", node, output: item.output } as const : { kind: "none" } as const;
    }
    if (node) return { kind: "node", node } as const;
    return pending ? { kind: "pending", text: pending.text } as const : { kind: "none" } as const;
  });
  /** A record chosen in a bound collection opens the collection's output, unless that output is disabled. */
  function dispatch(event: NodeEvent) {
    if (item.kind !== "collection" || event.kind !== "collection.select") { onevent?.(event); return; }
    if (!resolved.disabledOutputs.includes(item.output)) onevent?.({ kind: "surface.invoke", intent: {
      kind: "view.output", view: resolved.view.id, output: item.output, recordId: event.id,
    } });
  }
  const open = (output: string) => onevent?.({ kind: "surface.invoke", intent: { kind: "view.output", view: resolved.view.id, output } });
</script>

{#if bound.kind === "control"}
  <StackItem placement={stackPlacement(bound.node.kind)} kind={bound.node.kind}><NodeRenderer node={bound.node} /></StackItem>
{:else if bound.kind === "summary"}
  <SummaryWidget node={bound.node} available={!resolved.disabledOutputs.includes(bound.output)} activate={() => open(bound.output)} />
{:else if bound.kind === "pending"}
  <Text kind="body" align="start" live="polite" text={bound.text} />
{:else if bound.kind === "node" && host === "frame"}
  <NodeRenderer node={bound.node} onevent={dispatch} />
{:else if bound.kind === "node"}
  <StackItem placement={stackPlacement(bound.node.kind)} kind={bound.node.kind}><NodeRenderer node={bound.node} onevent={dispatch} /></StackItem>
{/if}
