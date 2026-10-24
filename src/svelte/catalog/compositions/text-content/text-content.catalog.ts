// TextContent: a view's text item, placed in the reading column.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { TextContentContract } from "./text-content.contract.ts";

export const TextContent = defineComposition({
  id: "text-content",
  purpose: { key: "textContent.purpose" },
  messages: ["textContent.purpose"],
  owner: { entry: "TextContent.svelte" },
  uses: ["information", "stack-item"], approval: "none", contract: TextContentContract,
} as const);
