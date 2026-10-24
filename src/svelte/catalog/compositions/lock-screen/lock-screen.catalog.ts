// LockScreen: unlock an identity on this device: the remembered profile (or an identity name) and its password, with
// the date and time over the wallpaper.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LockScreenContract } from "./lock-screen.contract.ts";

export const LockScreen = defineComposition({
  id: "lock-screen",
  purpose: "Unlock the selected identity while its private content stays hidden.",
  owner: { entry: "LockScreen.svelte" },
  uses: ["field-well", "icon", "measured-field", "seed-avatar", "stack-layout", "text-input"], approval: "required", contract: LockScreenContract,
} as const);
