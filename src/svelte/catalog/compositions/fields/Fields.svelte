<script lang="ts">
  import { Column, NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { imageInputControl } from "../../../../interaction/image-input.ts";
  import { labelsInputControl } from "../../../../interaction/labels-control.ts";
  import { isFormControlEvent } from "../../../../interaction/form-control-event.ts";
  let { fields, edit, controlEvent }: CatalogProps<"fields"> = $props();
</script>

<!-- The form's fields stand 1.25rem apart, the gap of the field group they were drawn in. -->
<Column gap="loose">
  {#each fields as field (field.name)}
    {#if field.primitive === "control.files"}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.files",
        control: imageInputControl(field.name, field.label, field.files,field.disabled ?? false,field.media) }}
        onevent={event => { if (isFormControlEvent(event)) controlEvent(event); }} />
    {:else if field.primitive === "control.labels"}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.labels",
        control: { ...labelsInputControl(field.name, field.label, field.values, field.limits, field.error, field.reference,field.mediaReference), disabled: field.disabled ?? false } }}
        onevent={event => { if (isFormControlEvent(event)) controlEvent(event); }} />
    {:else if field.primitive === "control.select"}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.select", control: {
        version: "desert.control/1", kind: "select", id: field.name, label: field.label,
        required: true, disabled: field.disabled ?? false, value: field.value, options: field.options,
      } }} onevent={event => { if (event.kind === "select.change" && event.value !== null) edit(field.name, event.value); }} />
    {:else}
    <NodeRenderer node={{ version: ResolvedNodeVersion, kind: field.primitive, name: field.name, label: field.label,
      value: field.value, required: field.required, disabled: field.disabled ?? false, ...(field.error ? { error: field.error } : {}),
      ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}) }}
      onevent={event => { if (event.kind === "input.change") edit(event.name, event.value); }} />
    {/if}
  {/each}
</Column>
