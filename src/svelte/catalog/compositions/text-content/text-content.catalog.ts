// TextContent: a view's text item, placed in the reading column.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { TextContentContract } from "./text-content.contract.ts";

export const TextContent = defineComposition({
  id: "text-content",
  purpose: "Place a view's text item as reading content in the stack.",
  owner: { entry: "TextContent.svelte" },
  uses: ["information"], approval: "none", contract: TextContentContract,
} as const);
