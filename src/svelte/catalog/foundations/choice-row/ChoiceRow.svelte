<script lang="ts">
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import { ChoiceItem } from "../../index.ts";
  import { pressFeedback } from "../../../vendor/components/ui/button/press-feedback.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { id, labelId, descriptionId, label, description, disabled, children }: CatalogProps<"choice-row"> = $props();
  let row = $state<HTMLLabelElement | null>(null);
  $effect(() => { if (row) return pressFeedback(row); });
</script>

<Field.FieldLabel bind:ref={row} for={id} class="tm-control" aria-disabled={disabled} data-grouped-row data-choice-row data-material="interior">
  <ChoiceItem {label} {labelId} {description} {descriptionId}>
    {@render children?.()}
  </ChoiceItem>
</Field.FieldLabel>
