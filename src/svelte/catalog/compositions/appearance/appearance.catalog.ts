// Appearance: the person's appearance preferences bound to the shared appearance state, with a notice when they
// could not be saved.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearanceContract } from "./appearance.contract.ts";

export const Appearance = defineComposition({
  id: "appearance",
  purpose: "Choose the interface appearance and see whether the choice could be kept.",
  owner: { entry: "Appearance.svelte" },
  uses: ["appearance-preferences", "feedback"], approval: "none", contract: AppearanceContract,
} as const);
