// Dialog: a centred message that asks for an answer or explains a problem: its face, title and subtitle over its text
// choices. It replaces the confirmation-dialog and problem compositions (DESIGN §3.2).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { DialogContract } from "./dialog.contract.ts";

export const Dialog = defineComposition({
  id: "dialog",
  purpose: { key: "dialog.purpose" },
  messages: ["dialog.purpose"],
  owner: { entry: "Dialog.svelte" },
  uses: ["action", "column", "face", "heading", "inline", "modal", "text"], approval: "required", contract: DialogContract,
} as const);
