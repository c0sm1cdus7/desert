// Modal: the temporary surface over its parent. An adaptive pane docks beside its parent when the host has room and is
// otherwise a modal pane at the right or bottom edge; a sheet presents a picker at the bottom edge with its grip; a message
// is centred; media fill the screen; navigation is the lateral pane. A locked modal cannot be dismissed.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ModalContract } from "./modal.contract.ts";

export const Modal = defineFoundation({
  id: "modal",
  purpose: "Present a temporary surface over its parent, dismissed by Escape, its scrim or its grip unless locked.",
  messages: ["modal.close", "modal.description"],
  owner: {
    entry: "Modal.svelte",
    parts: ["ModalPane.svelte", "ModalSheet.svelte", "ModalDialog.svelte", "DrawerGrip.svelte", "drawer-motion.svelte.ts",
      "frame-continuity.svelte.ts", "adaptive-modality.svelte.ts", "adaptive-surface-layout.ts", "modal.css"],
    vendor: ["dialog"], mechanisms: ["surface-focus", "surface-host", "swipe-motion"],
  },
  shape: "radius", states: ["open", "locked"],
  variants: { presentation: ["adaptive", "transient", "sheet", "message", "media", "navigation"] },
  // The media stage holds what media-viewer mounts in it (design §1.5): its image or player, and its top bar; a dialog
  // lays its face, title, subtitle and choices out in a column.
  slots: { children: { accepts: ["surface-frame", "instance-frame", "face", "heading", "text", "inline", "column", "bar", "image", "media-player"] },
    actions: { accepts: ["inline"] } },
  approval: "required", contract: ModalContract,
} as const);
