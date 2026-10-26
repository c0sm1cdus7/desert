// Action pair: a bar's bottom pair (law 9c) draws one label size; each step Action reports the size its own label needs
// (a word too wide for its line shrinks the label) and both halves draw the smaller. Owned by bar; action lists it in
// owner.mechanisms.
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const ActionPairMechanism = defineMechanism({ id: "action-pair", owner: "bar", files: ["action-pair.svelte.ts"] } as const);
