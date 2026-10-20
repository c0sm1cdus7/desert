<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Field from "../vendor/components/ui/field/index.js";
  import ChoiceItem from "./ChoiceItem.svelte";
  import { pressFeedback } from "../vendor/components/ui/button/press-feedback.js";
  let { id, labelId, descriptionId, label, description, disabled, children }: {
    id: string; labelId: string; descriptionId?: string; label: string;
    description?: string | undefined; disabled: boolean; children: Snippet;
  } = $props();
  let row = $state<HTMLLabelElement | null>(null);
  $effect(() => { if (row) return pressFeedback(row); });
</script>

<Field.FieldLabel bind:ref={row} for={id} class="tm-control" aria-disabled={disabled} data-grouped-row data-choice-row data-material="interior">
  <ChoiceItem {label} {labelId} {description} {descriptionId}>
    {@render children()}
  </ChoiceItem>
</Field.FieldLabel>
