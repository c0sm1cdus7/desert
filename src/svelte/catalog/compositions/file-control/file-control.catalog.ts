// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FileControlContract } from "./file-control.contract.ts";

export const FileControl = defineComposition({
  id: "file-control",
  purpose: "Select supported local files and inspect their limits before an operation uses them.",
  owner: { entry: "FileControl.svelte", parts: ["file-size.ts"] },
  uses: ["action"], approval: "none", contract: FileControlContract,
} as const);
