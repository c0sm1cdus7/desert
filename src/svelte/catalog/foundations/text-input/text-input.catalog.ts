// TextInput: a labelled writing field, a single line (optionally masked or with a credential purpose) or a multiline
// editor with a character counter, with its help text and validation feedback below the well. Its trailing accessory is
// the clear control, or an action the caller places there (the lock screen's unlock).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { TextInputContract } from "./text-input.contract.ts";

export const TextInput = defineFoundation({
  id: "text-input",
  purpose: "Write a single line or several with a persistent label, field help and validation feedback.",
  owner: { entry: "TextInput.svelte", parts: ["editor-capacity.ts"], vendor: ["field", "input", "input-group", "label", "textarea"] },
  shape: "radius", states: ["empty", "value", "invalid", "disabled", "masked"],
  variants: { primitive: ["input.text", "input.multiline"] }, stateVariants: { masked: { primitive: ["input.text"] } },
  slots: { accessory: { accepts: ["action"] } },
  renders: ["input.text", "input.multiline"], approval: "required", contract: TextInputContract,
} as const);
