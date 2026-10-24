// FileControl: choose local files for a files control, show their limits, the chosen files and why any were rejected.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FileControlContract } from "./file-control.contract.ts";

export const FileControl = defineComposition({
  id: "file-control",
  purpose: "Select supported local files and inspect their limits before an operation uses them.",
  owner: { entry: "FileControl.svelte", parts: ["file-size.ts"] },
  uses: ["action"], approval: "none", contract: FileControlContract,
} as const);
