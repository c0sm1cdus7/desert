// Dialog: a centred message that asks for an answer or explains a problem: its face, title and subtitle over its text
// choices. It replaces the confirmation-dialog and problem compositions (DESIGN §3.2); the node renderer mounts it for a
// problem node through the adapter its contract exports (ProblemDialog).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { DialogContract } from "./dialog.contract.ts";

export const Dialog = defineComposition({
  id: "dialog",
  purpose: { key: "dialog.purpose" },
  messages: ["dialog.purpose", "dialog.close"],
  owner: { entry: "Dialog.svelte" },
  uses: ["bar", "column", "face", "heading", "modal", "text"], renders: ["problem"], approval: "required", contract: DialogContract,
} as const);
