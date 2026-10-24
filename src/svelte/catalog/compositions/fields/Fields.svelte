<script lang="ts">
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import { NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { imageInputControl } from "../../../../interaction/image-input.ts";
  import { labelsInputControl } from "../../../../interaction/labels-control.ts";
  import { isFormControlEvent } from "../../../../interaction/form-control-event.ts";
  import { useFileHost } from "../../../infra/file-host-context.ts";
  const fileHost = useFileHost();
  let { fields, edit, controlEvent }: CatalogProps<"fields"> = $props();
</script>

<Field.FieldGroup data-composition="form">
  {#each fields as field (field.name)}
    {#if field.primitive === "control.files"}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.files",
        control: imageInputControl(field.name, field.label, field.files,field.disabled ?? false,field.media) }} host={fileHost}
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
</Field.FieldGroup>
