// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReadingContentContract } from "./reading-content.contract.ts";

export const ReadingContent = defineComposition({
  id: "reading-content",
  purpose: "Read paragraphs at a comfortable measure, outside the two-column layout used for properties.",
  owner: { entry: "ReadingContent.svelte" },
  uses: ["fact-value", "stack-layout"], approval: "none", contract: ReadingContentContract,
} as const);
