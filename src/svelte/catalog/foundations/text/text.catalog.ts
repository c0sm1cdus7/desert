// Text: a paragraph in one type role. The role is meaning (body, support, caption); no caller sets a size.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { TextContract } from "./text.contract.ts";

export const Text = defineFoundation({
  id: "text",
  purpose: "A paragraph of plain text in a type role (`kind`), optionally inset to align with rows.",
  owner: { entry: "Text.svelte" },
  shape: "none", states: ["default"],
  variants: { kind: ["body"], inset: ["none", "row"] },
  approval: "required", contract: TextContract,
} as const);
