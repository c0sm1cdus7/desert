<script lang="ts">
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { id, label, required = false, children }: CatalogProps<"field-well-content"> = $props();
</script>
<span class="relative flex min-w-0 flex-1 flex-col" data-field-well>
  {#if id}
    <Field.FieldLabel for={id}>{label}{#if required}<span class="required" aria-hidden="true">*</span>{/if}</Field.FieldLabel>
  {:else}
    <!-- Visible text belongs to the button; no nested label activation. -->
    <span data-slot="field-label">{label}{#if required}<span class="required" aria-hidden="true">*</span>{/if}</span>
  {/if}
  {@render children?.()}
</span>
