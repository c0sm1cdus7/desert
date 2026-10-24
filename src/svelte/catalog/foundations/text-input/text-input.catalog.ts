// TextInput was renamed Field (design §1.7): the folder stays until Batch 3 deletes it, and its entry draws through
// Field, which owns the writing vendor families and renders both input kinds. No caller mounts it any more.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { TextInputContract } from "./text-input.contract.ts";

export const TextInput = defineFoundation({
  id: "text-input",
  purpose: "Write a single line or several with a persistent label, field help and validation feedback.",
  owner: { entry: "TextInput.svelte" },
  shape: "radius", states: ["empty", "value", "invalid", "disabled", "masked"],
  variants: { primitive: ["input.text", "input.multiline"] }, stateVariants: { masked: { primitive: ["input.text"] } },
  slots: { accessory: { accepts: ["action"] } },
  approval: "required", contract: TextInputContract,
} as const);
