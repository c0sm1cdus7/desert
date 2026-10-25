<script lang="ts">
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import { ChoiceItem } from "../../index.ts";
  // lane-merge (lane N): press feedback moved to the press-feedback mechanism; Batch 3 deletes this folder.
  import { pressFeedback } from "../../mechanisms/press-feedback/press-feedback.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { id, labelId, descriptionId, label, description, disabled, children }: CatalogProps<"choice-row"> = $props();
  let row = $state<HTMLLabelElement | null>(null);
  $effect(() => { if (row) return pressFeedback(row); });
</script>

<Field.FieldLabel bind:ref={row} for={id} class="control-feedback material-interior" aria-disabled={disabled} data-grouped-row data-choice-row>
  <ChoiceItem {label} {labelId} {description} {descriptionId}>
    {@render children?.()}
  </ChoiceItem>
</Field.FieldLabel>
