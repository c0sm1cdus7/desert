// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InformationContract } from "./information.contract.ts";

export const Information = defineComposition({
  id: "information",
  purpose: "Group related facts in one pane while leaving reading paragraphs in the content stack.",
  owner: { entry: "Information.svelte" },
  uses: ["column", "fact-list", "fact-row", "text"], approval: "none", contract: InformationContract,
} as const);
