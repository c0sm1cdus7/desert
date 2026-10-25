// Text: a paragraph in one type role. The role is meaning (body, support, caption); tone, weight and alignment are finite
// choices, and a status paragraph announces itself (live). No caller sets a size or a color.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { TextContract } from "./text.contract.ts";

export const Text = defineFoundation({
  id: "text",
  purpose: { key: "text.purpose" }, messages: ["text.purpose"],
  owner: { entry: "Text.svelte" },
  shape: "none", states: ["default"],
  variants: { kind: ["body", "support", "caption"], tone: ["default", "muted", "destructive"] },
  approval: "required", contract: TextContract,
} as const);
