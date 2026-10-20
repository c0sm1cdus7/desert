<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Field from "../vendor/components/ui/field/index.js";
  import Heading from "./Heading.svelte";
  let { title, description, required = false, children }: {
    title: string; description?: string; required?: boolean; children: Snippet;
  } = $props();
  const id = $props.id();
</script>

<Field.FieldSet class="place-stack" aria-describedby={description ? `${id}-description` : undefined}>
  <Field.FieldLegend class="place-stack-title">
    <Heading level={2} class="type-caption">{title}{#if required}<span class="required" aria-hidden="true">*</span>{/if}</Heading>
  </Field.FieldLegend>
  <Field.FieldGroup class="place-stack-content">{@render children()}</Field.FieldGroup>
  {#if description}<p id={`${id}-description`} class="place-stack-description type-caption text-muted-foreground">{description}</p>{/if}
</Field.FieldSet>
