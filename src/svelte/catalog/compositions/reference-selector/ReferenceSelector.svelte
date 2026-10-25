<script lang="ts">
  import { Action, Choice, Column, Field, Popover, StackLayout, Text } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import type { FieldDisplay } from "../../../infra/field-display.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, onevent }: CatalogProps<"reference-selector"> = $props();
  let open = $state(false);
  let creating = $state(false), name = $state(""), color = $state(""), submitted = $state(false), observedBusy = $state(false);
  let reference = $derived(node.reference!);
  let locked = $derived(Boolean(node.disabled || reference.busy || reference.uncertain));
  let triggerLocked = $derived(reference.busy || (node.disabled && !reference.uncertain));
  let full = $derived(node.values.length >= node.limits.maxItems);
  /** The well shows the chosen references (each with its color), or a placeholder while nothing is chosen. */
  let display: FieldDisplay = $derived(node.values.length ? { kind: "tags", tags: node.values.map(value => {
    const option = reference.options.find(item => item.value === value);
    return option ? { label: option.label, state: "known" as const, ...option.color ? { color: option.color } : {} }
      : { label: say(m.referenceSelector.unavailable), state: "unavailable" as const };
  }) } : { kind: "text", text: say(m.referenceSelector.choose), placeholder: true });
  $effect(() => {
    if (submitted && reference.busy) observedBusy = true;
    if (submitted && observedBusy && !reference.busy) {
      submitted = false; observedBusy = false;
      if (!reference.error && !reference.uncertain) { creating = false; name = ""; }
    }
  });
  /** Opening refreshes the choices. While a write is busy the surface stays open, whatever asks it to close. */
  function openChange(next: boolean) {
    if (!next && reference.busy) return;
    if (next && !open) onevent?.({ kind: "reference.refresh", control: node.id });
    open = next;
  }
  function create() {
    if (locked || !reference.createLabel || !name.trim() || name.trim().length > reference.maxLength || full) return;
    submitted = true;
    onevent?.({ kind: "reference.create", control: node.id, name: name.trim(), ...(reference.colors.length ? { color: color || reference.colors[0]! } : {}) });
  }
  function choose(selected: readonly string[]) {
    if (!locked) onevent?.({ kind: "labels.change", control: node.id, values: selected });
  }
</script>
<!-- The well and the control's error stand 0.5rem apart, as in a field. -->
<Column gap="snug">
  <Popover label={node.label} {open} disabled={triggerLocked} locked={reference.busy} content="form" placement="anchored" align="start"
    onopenchange={openChange} trigger={{ kind: "field", label: node.label, required: false, invalid: false, display, measure: "fill" }}>
    <StackLayout title={node.label}>
      {#if reference.loading}<Text kind="caption" tone="muted" text={say(m.referenceSelector.loading)} />{/if}
      {#if reference.options.length}
        <Choice presentation="rows" cardinality="many" frame="interior" label={node.label} labelVisibility="accessible" selected={node.values}
          disabled={locked} required={false} onchange={choose} options={reference.options.map(option => ({ value: option.value, label: option.label,
            disabled: !node.values.includes(option.value) && full, ...option.color ? { leading: { kind: "color" as const, color: option.color } } : {} }))} />
      {:else if !reference.loading && !reference.error}
        <Text kind="caption" tone="muted" text={say(m.referenceSelector.empty)} />
      {/if}
      {#if reference.error}<Text kind="support" tone="destructive" live="assertive" text={reference.error} />{/if}
      {#if reference.createLabel}
        {#if reference.uncertain}
          <Action label={say(m.referenceSelector.check)} icon="recover" emphasis="secondary" face="text" type="button"
            state={reference.busy ? "unavailable" : "ready"} onclick={() => onevent?.({ kind: "reference.recover", control: node.id })} />
        {:else if creating}
          <Field primitive="input.text" label={say(m.referenceSelector.name)} labelVisibility="visible" measure="writing" purpose="text" value={name}
            required invalid={false} maxLength={reference.maxLength} disabled={locked} clear onchange={value => name = value} />
          {#if reference.colors.length}
            <Choice presentation="menu" cardinality="one" menuTrigger="well" label={say(m.referenceSelector.color)} labelVisibility="visible"
              selected={[color || reference.colors[0]!]} disabled={locked} required={false} onchange={selected => { if (selected[0]) color = selected[0]; }}
              options={reference.colors.map(value => ({ value, label: value[0]!.toUpperCase() + value.slice(1), disabled: false }))} />
          {/if}
          <Action label={say(m.referenceSelector.cancel)} icon="close" emphasis="secondary" face="text" type="button"
            state={locked ? "unavailable" : "ready"} onclick={() => { creating = false; name = ""; }} />
          <Action label={reference.createLabel} icon="create" emphasis="primary" face="text" type="button"
            state={locked || !name.trim() || name.trim().length > reference.maxLength ? "unavailable" : "ready"} onclick={create} />
        {:else}
          <Action label={reference.createLabel} icon="create" emphasis="secondary" face="text" type="button"
            state={locked || full ? "unavailable" : "ready"} onclick={() => creating = true} />
        {/if}
      {/if}
    </StackLayout>
  </Popover>
  {#if node.error}<Text kind="support" tone="destructive" live="assertive" text={node.error} />{/if}
</Column>
