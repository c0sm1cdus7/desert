// Face: the round decorative mark beside a title or an option: an action icon, a document, a status, a short symbol or
// a region flag. It is hidden from assistive technology; the text next to it carries the meaning.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FaceContract } from "./face.contract.ts";

export const Face = defineFoundation({
  id: "face",
  purpose: { key: "face.purpose" }, messages: ["face.purpose"],
  owner: { entry: "Face.svelte" },
  shape: "none", states: ["icon", "document", "warning", "error", "symbol", "flag", "compact"],
  approval: "required", contract: FaceContract,
} as const);
