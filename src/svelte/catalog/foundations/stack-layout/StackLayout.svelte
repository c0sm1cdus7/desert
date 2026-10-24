<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import { Heading } from "../../index.ts";
  let { title, description, required = false, children, headingVisibility = "visible" }: {
    title: string; description?: string; required?: boolean; children: Snippet;
    headingVisibility?: "visible" | "accessible";
  } = $props();
  const id = $props.id();
</script>

<Field.FieldSet class="place-stack" aria-describedby={description ? `${id}-description` : undefined}>
  <Field.FieldLegend class="place-stack-title" visibility={headingVisibility}>
    <Heading kind="group-label" text={title} {required} />
  </Field.FieldLegend>
  <Field.FieldGroup class="place-stack-content">{@render children()}</Field.FieldGroup>
  {#if description}<p id={`${id}-description`} class="place-stack-description type-caption text-muted-foreground">{description}</p>{/if}
</Field.FieldSet>
