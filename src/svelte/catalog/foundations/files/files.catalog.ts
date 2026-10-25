// Files: choose local files for a files control through the browser's own chooser, read their limits, the files chosen
// (each removable) and why any were rejected. Choosing files does not upload them.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FilesContract } from "./files.contract.ts";

export const Files = defineFoundation({
  id: "files",
  purpose: "Select supported local files and inspect their limits before an operation uses them.",
  messages: ["files.choose", "files.limits", "files.selected", "files.file", "files.remove", "files.none", "files.rejected", "files.mediaType", "files.fileSize", "files.totalSize", "files.count"],
  owner: { entry: "Files.svelte", parts: ["file-size.ts", "files.css"], mechanisms: ["file-picker"] },
  shape: "none", states: ["empty", "chosen", "disabled"], renders: ["control.files"], approval: "required", contract: FilesContract,
} as const);
