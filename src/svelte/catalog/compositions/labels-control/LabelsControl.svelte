<script lang="ts">
  import { Action, Column, Field, Form, Inline, MediaReferenceSelector, Popover, ReferenceSelector, StackLayout, Tag, Text } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { addWrittenLabel } from "../../../../interaction/label-writing.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, onevent }: CatalogProps<"labels-control"> = $props();
  let writing = $state(""), feedback = $state(""), open = $state(false);
  let full = $derived(node.values.length >= node.limits.maxItems);
  function add() {
    const result = addWrittenLabel(node, writing);
    if (!result.added) { feedback = result.message; return; }
    onevent?.({ kind: "labels.change", control: node.id, values: result.values }); writing = ""; feedback = ""; open = false;
  }
  const remove = (index: number) => onevent?.({ kind: "labels.change", control: node.id, values: node.values.filter((_, position) => position !== index) });
</script>
{#if node.mediaReference}<MediaReferenceSelector {node} {onevent} />{:else if node.reference}<ReferenceSelector {node} {onevent} />{:else}
<StackLayout title={node.label}>
  <!-- The chosen labels, the action that writes a new one and the control's error stand 1rem apart. -->
  <Column gap="regular">
    {#if node.values.length}
      <Inline gap="snug" overflow="wrap">
        {#each node.values as value, index (index)}
          <Tag presentation="chip" tone="neutral" label={value} state="known" removable removeLabel={say(m.labelsControl.remove, { value })}
            disabled={node.disabled} onremove={() => remove(index)} />
        {/each}
      </Inline>
    {/if}
    <Popover label={say(m.labelsControl.newLabel)} {open} disabled={node.disabled || full} locked={false} content="form" placement="anchored"
      align="start" onopenchange={next => { open = next; }}
      trigger={{ kind: "action", label: say(m.labelsControl.add), icon: "create", face: "fit", emphasis: "secondary", state: "ready" }}>
      <Form label={say(m.labelsControl.newLabel)} submit={add} fill={false}>
        <StackLayout title={say(m.labelsControl.newLabel)}>
          <Field primitive="input.text" label={say(m.labelsControl.label)} labelVisibility="visible" measure="writing" purpose="text" value={writing}
            required={false} invalid={false} disabled={false} maxLength={node.limits.maxLength} counter clear onchange={value => writing = value} />
          {#if feedback}<Text kind="support" tone="destructive" live="assertive" text={feedback} />{/if}
          <Action label={say(m.labelsControl.add)} icon="create" emphasis="primary" face="text" type="submit"
            state={!writing.trim() || node.disabled ? "unavailable" : "ready"} />
        </StackLayout>
      </Form>
    </Popover>
    {#if node.error}<Text kind="support" tone="destructive" live="assertive" text={node.error} />{/if}
  </Column>
</StackLayout>
{/if}
