<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { resolvedNode } from "../../../../interaction/resolved-node.ts";
  import { nodeEvent, type NodeEvent } from "../../../../interaction/node-events.ts";
  import type { ControlEvent } from "../../../../interaction/control-nodes.ts";
  import { nodeRenderers } from "../../../renderer-registry.ts";

  let { node, onevent = () => {}, continuity }: CatalogProps<"node-renderer"> = $props();
  let checked = $derived(resolvedNode(node));
  const emit = (event: NodeEvent) => onevent(nodeEvent(event));
  const control = (event: ControlEvent) => emit(event);
  function activate() {
    if (checked.kind !== "action" || checked.form || checked.action.state !== "ready") return;
    const intent = checked.action.intent;
    if (intent.kind === "catalog.open" || intent.kind === "catalog.back") emit(intent);
    else if (intent.kind === "catalog" || intent.kind === "search.clear" || intent.kind === "specimen" ||
      intent.kind === "transient.open" || intent.kind === "selection.clear") emit({ kind: "local.invoke", intent });
    else emit({ kind: "surface.invoke", intent });
  }
</script>

{#if checked.kind === "input.text"}
  {@const Renderer = nodeRenderers[checked.kind]}
  <Renderer primitive={checked.kind} identity={checked.name} label={checked.label} labelVisibility="visible" measure="writing" purpose="text"
    value={checked.value} required={checked.required} invalid={false} disabled={checked.disabled} error={checked.error} helper={checked.helper}
    mask={checked.mask} maxLength={checked.maxLength} clear
    onchange={value => checked.kind === "input.text" && emit({ kind: "input.change", name: checked.name, value })} />
{:else if checked.kind === "input.multiline"}
  {@const Renderer = nodeRenderers[checked.kind]}
  <Renderer primitive={checked.kind} label={checked.label} labelVisibility="visible" measure="writing" value={checked.value}
    required={checked.required} invalid={false} disabled={checked.disabled} error={checked.error} helper={checked.helper} maxLength={checked.maxLength}
    onchange={value => checked.kind === "input.multiline" && emit({ kind: "input.change", name: checked.name, value })} />
{:else if checked.kind === "action"}
  {@const Renderer = nodeRenderers.action}
  <Renderer label={checked.action.label} icon={checked.action.icon} state={checked.action.state} emphasis={checked.role} face="fit"
    reason={checked.action.reason} type={checked.form ? "submit" : "button"} onclick={activate} />
{:else if checked.kind === "availability"}
  {@const Renderer = nodeRenderers.availability}<Renderer state={checked.state} label={checked.label} />
{:else if checked.kind === "fact"}
  {@const Renderer = nodeRenderers.fact}<Renderer {...checked.details} />
{:else if checked.kind === "form"}
  {@const Renderer = nodeRenderers.form}<Renderer fields={checked.content.fields} edit={(name, value) => emit({ kind: "input.change", name, value })} controlEvent={emit} />
{:else if checked.kind === "context"}
  {@const Renderer = nodeRenderers.context}<Renderer {...checked.content.details} attention={checked.content.attention} selectors={checked.content.selectors} presentation={checked.content.presentation}
    onselect={journey => emit({ kind: "surface.invoke", intent: { kind: "journey", journey } })} actions={checked.content.actions.map(action => ({
    id: action.destination, label: action.label, available: action.available,
    invoke: () => emit({ kind: "surface.invoke", intent: { kind: "journey", journey: action.destination } }),
  }))} />
{:else if checked.kind === "review"}
  {@const Renderer = nodeRenderers.review}<Renderer {...checked.content} />
{:else if checked.kind === "collection"}
  {@const Renderer = nodeRenderers.collection}<Renderer node={checked} select={id => emit({ kind: "collection.select", id })} />
{:else if checked.kind === "transient"}
  <!-- The transient node is drawn by ViewPanel: Modal over its frame, reporting the frame's events as node events. -->
  {@const Renderer = nodeRenderers.transient}<Renderer panel={{ label: checked.label, locked: checked.locked, frame: checked.frame }}
    open={checked.open} continuity={continuity} {onevent} />
{:else if checked.kind === "problem"}
  <!-- The problem node is drawn by Dialog, whose contract adapts the node's own props (its problem variant). -->
  {@const Renderer = nodeRenderers.problem}<Renderer open={checked.open} locked={checked.locked} title={checked.title}
    description={checked.description} severity={checked.severity} ondismiss={() => emit({ kind: "problem.close" })} />
{:else if checked.kind === "control.select"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.popover"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.files"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.labels"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.options"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.money"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.date"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.tag"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "control.image"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "control.avatar"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "catalog.card"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{:else if checked.kind === "catalog.home"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{:else if checked.kind === "catalog.detail"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{/if}
