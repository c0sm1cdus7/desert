<script lang="ts">
  import * as Field from "./vendor/components/ui/field/index.js";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import type { FrameContent } from "../interaction/surface-frame.ts";
  import { imageInputControl } from "../interaction/image-input.ts";
  import { labelsInputControl } from "../interaction/labels-control.ts";
  import { isFormControlEvent, type FormControlEvent } from "../interaction/form-control-event.ts";
  import { useFormFiles } from "./pieces/form-files.ts";
  const fileHost = useFormFiles();
  let { fields, edit, controlEvent }: {
    fields: Extract<FrameContent, { kind: "form" }>["fields"];
    edit: (name: string, value: string) => void;
    controlEvent: (event: FormControlEvent) => void;
  } = $props();
</script>

<Field.FieldGroup data-composition="form">
  {#each fields as field (field.name)}
    {#if field.primitive === "control.files"}
      <BankRenderer node={{ version: BankVersion, kind: "control.files",
        control: imageInputControl(field.name, field.label, field.files,field.disabled ?? false,field.media) }} host={fileHost}
        onevent={event => { if (isFormControlEvent(event)) controlEvent(event); }} />
    {:else if field.primitive === "control.labels"}
      <BankRenderer node={{ version: BankVersion, kind: "control.labels",
        control: { ...labelsInputControl(field.name, field.label, field.values, field.limits, field.error, field.reference,field.mediaReference), disabled: field.disabled ?? false } }}
        onevent={event => { if (isFormControlEvent(event)) controlEvent(event); }} />
    {:else if field.primitive === "control.select"}
      <BankRenderer node={{ version: BankVersion, kind: "control.select", control: {
        version: "desert.control/1", kind: "select", id: field.name, label: field.label,
        required: true, disabled: field.disabled ?? false, value: field.value, options: field.options,
      } }} onevent={event => { if (event.kind === "select.change" && event.value !== null) edit(field.name, event.value); }} />
    {:else}
    <BankRenderer node={{ version: BankVersion, kind: field.primitive, name: field.name, label: field.label,
      value: field.value, required: field.required, disabled: field.disabled ?? false, ...(field.error ? { error: field.error } : {}),
      ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}) }}
      onevent={event => { if (event.kind === "input.change") edit(event.name, event.value); }} />
    {/if}
  {/each}
</Field.FieldGroup>
