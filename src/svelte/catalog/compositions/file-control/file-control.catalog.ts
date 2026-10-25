// FileControl: choose local files for a files control, drawn by the Files foundation that replaces it.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FileControlContract } from "./file-control.contract.ts";

export const FileControl = defineComposition({
  id: "file-control",
  purpose: { key: "fileControl.purpose" },
  messages: ["fileControl.purpose"],
  owner: { entry: "FileControl.svelte" },
  uses: ["files"], approval: "none", contract: FileControlContract,
} as const);
