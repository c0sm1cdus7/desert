import type { HTMLButtonAttributes } from "svelte/elements";
import type { Attachment } from "svelte/attachments";

/** Private Bits trigger wiring. This type is deliberately outside the serializable bank grammar. */
export type ActionElementProps = Pick<HTMLButtonAttributes, "id" | "aria-expanded" | "aria-controls" | "aria-haspopup" |
  "onclick" | "onkeydown" | "onpointerdown" | "onpointerenter" | "onpointerleave"> & {
    "data-state"?: string; [key: symbol]: Attachment<HTMLButtonElement>;
  };
