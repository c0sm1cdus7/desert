// What each hint of the toolbar sends when its control is used: one table, the same for every renderer.
import type { HintKey, Intent } from "./contract.ts";

/** Each hint's intent, as the router already takes it; "move" is up and down, the two of them. */
export const hintSends: Readonly<Record<HintKey, Intent | "move">> = {
  move: "move",
  confirm: { kind: "confirm" },
  cancel: { kind: "cancel" },
  switch: { kind: "switch" },
  /** The panel goes full and back: talk.ts reads an f. */
  full: { kind: "type", text: "f" },
  /** A many question marks the chosen option with a space: walking.ts. */
  mark: { kind: "type", text: " " },
  /** On a menu, space starts looking for something: step.ts. */
  find: { kind: "type", text: " " },
};
