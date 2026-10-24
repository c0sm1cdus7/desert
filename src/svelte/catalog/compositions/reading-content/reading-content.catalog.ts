// ReadingContent: the long-text fields of an object, each under its label as a paragraph at reading measure.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReadingContentContract } from "./reading-content.contract.ts";

export const ReadingContent = defineComposition({
  id: "reading-content",
  purpose: "Read paragraphs at a comfortable measure, outside the two-column layout used for properties.",
  owner: { entry: "ReadingContent.svelte" },
  uses: ["fact-value", "stack-layout"], approval: "none", contract: ReadingContentContract,
} as const);
