// ReadingContent: the long-text fields of an object, each under its label as a paragraph at reading measure.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReadingContentContract } from "./reading-content.contract.ts";

export const ReadingContent = defineComposition({
  id: "reading-content",
  purpose: { key: "readingContent.purpose" },
  messages: ["readingContent.purpose"],
  owner: { entry: "ReadingContent.svelte" },
  uses: ["column", "fact-value", "spacer", "stack-layout"], approval: "none", contract: ReadingContentContract,
} as const);
