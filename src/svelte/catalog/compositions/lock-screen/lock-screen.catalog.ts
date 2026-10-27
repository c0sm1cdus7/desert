// LockScreen: unlock an identity on this device: the remembered profile (or an identity name) and its password, with
// the date and time over the wallpaper.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LockScreenContract } from "./lock-screen.contract.ts";

export const LockScreen = defineComposition({
  id: "lock-screen",
  purpose: { key: "lockScreen.purpose" },
  messages: ["lockScreen.purpose", "lockScreen.unlock", "lockScreen.avatar", "lockScreen.identity", "lockScreen.identityName",
    "lockScreen.password", "lockScreen.useAnotherIdentity"],
  owner: { entry: "LockScreen.svelte" },
  uses: ["action", "avatar", "clock", "column", "field", "form", "heading", "stack-layout"], approval: "required", contract: LockScreenContract,
} as const);
