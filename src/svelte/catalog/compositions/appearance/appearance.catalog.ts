// Appearance: the person's appearance preferences bound to the shared appearance state, with a notice when they
// could not be saved.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AppearanceContract } from "./appearance.contract.ts";

export const Appearance = defineComposition({
  id: "appearance",
  purpose: { key: "appearance.purpose" }, messages: ["appearance.purpose"],
  owner: { entry: "Appearance.svelte" },
  uses: ["appearance-preferences", "text"], approval: "none", contract: AppearanceContract,
} as const);
