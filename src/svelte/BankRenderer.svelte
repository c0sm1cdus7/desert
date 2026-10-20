<script lang="ts">
  import type { ActionElementProps } from "./action-adapter.ts";
  import { bankNode, type BankNode } from "../interaction/bank-node.ts";
  import { bankEvent, type BankEvent } from "../interaction/bank-events.ts";
  import type { ControlEvent } from "../interaction/control-nodes.ts";
  import type { LocalFileHost } from "./controls/file-host.ts";
  import { webRenderers } from "./renderer-registry.ts";

  let { node, onevent = () => {}, host, actionElementProps }: {
    node: BankNode; onevent?: (event: BankEvent) => void; host?: LocalFileHost;
    actionElementProps?: ActionElementProps;
  } = $props();
  let checked = $derived(bankNode(node));
  const emit = (event: BankEvent) => onevent(bankEvent(event));
  const control = (event: ControlEvent) => emit(event);
  function activate() {
    if (checked.kind !== "action" || checked.form || checked.action.state !== "ready") return;
    const intent = checked.action.intent;
    if (intent.kind === "catalog.open" || intent.kind === "catalog.back") emit(intent);
    else if (intent.kind === "catalog" || intent.kind === "search.clear" || intent.kind === "specimen" ||
      intent.kind === "transient.open" || intent.kind === "selection.clear") emit({ kind: "local.invoke", intent });
    else emit({ kind: "surface.invoke", intent });
  }
  function fileHost() { if (!host) throw new Error("LOCAL_FILE_HOST_REQUIRED"); return host; }
</script>

{#if checked.kind === "input.text"}
  {@const Renderer = webRenderers[checked.kind]}
  <Renderer primitive={checked.kind} identity={checked.name} label={checked.label} value={checked.value} required={checked.required}
    disabled={checked.disabled} error={checked.error} mask={checked.mask} maxLength={checked.maxLength}
    onchange={value => checked.kind === "input.text" && emit({ kind: "input.change", name: checked.name, value })} />
{:else if checked.kind === "input.multiline"}
  {@const Renderer = webRenderers[checked.kind]}
  <Renderer primitive={checked.kind} label={checked.label} value={checked.value} required={checked.required}
    disabled={checked.disabled} error={checked.error} maxLength={checked.maxLength}
    onchange={value => checked.kind === "input.multiline" && emit({ kind: "input.change", name: checked.name, value })} />
{:else if checked.kind === "action"}
  {@const Renderer = webRenderers.action}
  <Renderer label={checked.action.label} icon={checked.action.icon} state={checked.action.state} emphasis={checked.role}
    type={checked.form ? "submit" : "button"} onclick={activate} elementProps={actionElementProps} />
{:else if checked.kind === "availability"}
  {@const Renderer = webRenderers.availability}<Renderer state={checked.state} label={checked.label} />
{:else if checked.kind === "fact"}
  {@const Renderer = webRenderers.fact}<Renderer {...checked.details} />
{:else if checked.kind === "form"}
  {@const Renderer = webRenderers.form}<Renderer fields={checked.content.fields} edit={(name, value) => emit({ kind: "input.change", name, value })} />
{:else if checked.kind === "context"}
  {@const Renderer = webRenderers.context}<Renderer {...checked.content.details} actions={checked.content.actions.map(action => ({
    id: action.destination, label: action.label, available: action.available,
    invoke: () => emit({ kind: "surface.invoke", intent: { kind: "journey", journey: action.destination } }),
  }))} />
{:else if checked.kind === "review"}
  {@const Renderer = webRenderers.review}<Renderer {...checked.content} />
{:else if checked.kind === "collection"}
  {@const Renderer = webRenderers.collection}<Renderer node={checked} select={id => emit({ kind: "collection.select", id })} />
{:else if checked.kind === "transient"}
  {@const Renderer = webRenderers.transient}<Renderer label={checked.label} open={checked.open} locked={checked.locked} frame={checked.frame}
    onclose={() => emit({ kind: "transient.close" })} onclosed={() => emit({ kind: "transient.closed" })}
    invoke={intent => emit({ kind: "surface.invoke", intent })} edit={(name, value) => emit({ kind: "input.change", name, value })} />
{:else if checked.kind === "problem"}
  {@const Renderer = webRenderers.problem}<Renderer open={checked.open} title={checked.title} description={checked.description}
    locked={checked.locked} severity={checked.severity} close={() => emit({ kind: "problem.close" })} />
{:else if checked.kind === "control.select"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.popover"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.files"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} host={fileHost()} />
{:else if checked.kind === "control.options"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.money"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.date"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.tag"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "control.image"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "control.avatar"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "catalog.card"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{:else if checked.kind === "catalog.home"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{:else if checked.kind === "catalog.detail"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{/if}
