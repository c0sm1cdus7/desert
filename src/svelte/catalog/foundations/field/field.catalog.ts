// Field: one labelled writing field, a single line (plain, credential, search or masked) or a multiline editor with its
// character counter, or the trigger well of a surface an overlay opens; help and validation feedback sit below the well.
// Its trailing accessory is the clear control, or an action the caller places there (the lock screen's unlock); its
// prefix is a choice the value depends on (the money currency). It is the rename of text-input and absorbs the well,
// its label, the masked editor, the clear control, the counter, the measured box and the search well.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FieldContract } from "./field.contract.ts";

export const Field = defineFoundation({
  id: "field",
  purpose: "Write a single line or several, or open a choice, in one labelled well with field help and validation feedback.",
  owner: {
    entry: "Field.svelte",
    parts: ["FieldWell.svelte", "FieldLabel.svelte", "FieldEditor.svelte", "FieldTrigger.svelte", "SearchWell.svelte", "MaskedInput.svelte",
      "input-edit-history.ts", "ClearInput.svelte", "CharacterCounter.svelte", "editor-capacity.ts", "field.css", "field-measure.css"],
    vendor: ["field", "input", "input-group", "label", "textarea"],
  },
  shape: "radius", states: ["empty", "value", "invalid", "disabled", "masked"],
  variants: { primitive: ["input.text", "input.multiline", "trigger"], measure: ["writing", "choice", "date", "amount", "fill"] },
  stateVariants: { masked: { primitive: ["input.text"] } },
  slots: { accessory: { accepts: ["action"] }, prefix: { accepts: ["selection-field"] } },
  renders: ["input.text", "input.multiline"], approval: "required", contract: FieldContract,
} as const);
