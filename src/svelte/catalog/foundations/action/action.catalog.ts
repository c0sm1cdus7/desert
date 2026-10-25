// Action: one command as a button. Its face is the caller's choice of what fits the place: its label while it fits
// and its icon otherwise, always its icon (a toolbar, a field's accessory) or always its label (a bottom pair, a dialog).
// A pending command spins its icon, an unavailable one is disabled and may say why; an overlay's trigger carries the
// disclosure of the surface it opens as data.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ActionContract } from "./action.contract.ts";

export const Action = defineFoundation({
  id: "action",
  purpose: "Invoke one command with a text button or an icon button, never competing text and icons.",
  owner: { entry: "Action.svelte", mechanisms: ["press-feedback"], vendor: ["button"] },
  shape: "radius", states: ["ready", "unavailable", "pending"],
  variants: { emphasis: ["primary", "secondary", "destructive"], face: ["fit", "icon", "text"] },
  renders: ["action"], approval: "required", contract: ActionContract,
} as const);
