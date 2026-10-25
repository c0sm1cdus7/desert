<script lang="ts">
  import { Action, Choice, CollectionState, Column, Popover, StackLayout, Text } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import type { FieldDisplay } from "../../../infra/field-display.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, onevent }: CatalogProps<"media-reference-selector"> = $props();
  let open = $state(false);
  let reference = $derived(node.mediaReference!);
  let selected = $derived(reference.options.find(option => node.values.includes(option.value)));
  /** The well shows the chosen cover beside its text, or says the cover is automatic (or no longer available). */
  let display: FieldDisplay = $derived(selected ? { kind: "image", source: selected.source, text: say(m.mediaReferenceSelector.selected) }
    : { kind: "text", text: node.values.length ? say(m.mediaReferenceSelector.unavailable) : say(m.mediaReferenceSelector.automatic), placeholder: false });
  function openChange(next: boolean) {
    if (next && !open) onevent?.({ kind: "reference.refresh", control: node.id });
    open = next;
  }
  function choose(value?: string) {
    if (node.disabled) return;
    onevent?.({ kind: "labels.change", control: node.id, values: value ? [value] : [] });
    open = false;
  }
</script>

<!-- One selector-field anatomy (law 9b), the reference selector's: «label · value» inside the well, the well and the
     control's error 0.5rem apart. -->
<Column gap="snug">
  <Popover label={node.label} {open} disabled={node.disabled} locked={false} content="form" placement="anchored" align="start"
    onopenchange={openChange} trigger={{ kind: "field", label: node.label, required: false, invalid: false, display, measure: "fill" }}>
    <StackLayout title={node.label}>
      {#if reference.loading}<Text kind="caption" tone="muted" text={say(m.mediaReferenceSelector.loading)} />{/if}
      {#if reference.options.length}
        <Choice presentation="cards" cardinality="one" label={node.label} labelVisibility="accessible" selected={node.values}
          disabled={node.disabled} required={false} onchange={next => choose(next[0])}
          options={reference.options.map((option, index) => ({ value: option.value, label: say(m.mediaReferenceSelector.cover, { number: String(index + 1) }),
            disabled: false, leading: { kind: "image" as const, source: option.source, alt: "" } }))} />
      {:else if !reference.loading}<CollectionState loaded createLabel={undefined} />{/if}
      <Action label={say(m.mediaReferenceSelector.automaticCover)} icon="restore" emphasis="secondary" face="text" type="button"
        state={node.disabled ? "unavailable" : "ready"} onclick={() => choose()} />
      {#if reference.error}<Text kind="support" tone="destructive" live="assertive" text={reference.error} />{/if}
    </StackLayout>
  </Popover>
  {#if node.error}<Text kind="support" tone="destructive" live="assertive" text={node.error} />{/if}
</Column>
