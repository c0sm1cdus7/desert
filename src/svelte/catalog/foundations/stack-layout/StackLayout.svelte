<script lang="ts">
  import { Heading } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { title, description, required = false, children, headingVisibility = "visible" }: CatalogProps<"stack-layout"> = $props();
  const id = $props.id();
  // Literal class names (the fieldset, legend and group geometry the vendor field family drew), so the theme's
  // Tailwind scan sees every step.
  const fieldset = "flex min-w-0 flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3 place-stack";
  const legend = "mb-1.5 max-w-full break-words type-control place-stack-title";
  const group = "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4 place-stack-content";
</script>

<fieldset class={fieldset} aria-describedby={description ? `${id}-description` : undefined}>
  <!-- F1-merge: Heading kind "group-label" becomes "group" (F1a). -->
  <legend class={headingVisibility === "accessible" ? `${legend} sr-only` : legend}><Heading kind="group-label" text={title} {required} /></legend>
  <div class={group}>{@render children?.()}</div>
  {#if description}<p id={`${id}-description`} class="place-stack-description type-caption text-muted-foreground">{description}</p>{/if}
</fieldset>
