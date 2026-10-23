// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FieldsContract } from "./fields.contract.ts";

export const Fields = defineComposition({
  id: "fields",
  purpose: "Complete the inputs of one operation while retaining drafts and showing local feedback.",
  owner: { entry: "Fields.svelte" },
  uses: ["node-renderer"], approval: "none", contract: FieldsContract,
} as const);
