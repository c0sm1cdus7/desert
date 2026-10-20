<script lang="ts">
  import * as Field from "./vendor/components/ui/field/index.js";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import type { FrameContent } from "../interaction/surface-frame.ts";
let { fields, edit }: {
    fields: Extract<FrameContent, { kind: "form" }>["fields"];
    edit: (name: string, value: string) => void;
  } = $props();
</script>

<Field.FieldGroup data-composition="form">
  {#each fields as field (field.name)}
    <BankRenderer node={{ version: BankVersion, kind: field.primitive, name: field.name, label: field.label,
      value: field.value, required: field.required, disabled: false, ...(field.error ? { error: field.error } : {}),
      ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}) }}
      onevent={event => { if (event.kind === "input.change") edit(event.name, event.value); }} />
  {/each}
</Field.FieldGroup>
