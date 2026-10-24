// AccessExperience: the access screen over the wallpaper: onboarding form, lock screen or connection state, with its error.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessExperienceContract } from "./access-experience.contract.ts";

export const AccessExperience = defineComposition({
  id: "access-experience",
  purpose: "Show the access screen over the wallpaper: the onboarding form, the lock screen or the connection state, with its error.",
  owner: { entry: "AccessExperience.svelte" },
  uses: ["access-form", "feedback", "lock-screen", "stack-layout", "wallpaper"], approval: "required", contract: AccessExperienceContract,
} as const);
