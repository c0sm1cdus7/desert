// AccessExperience: the access screen over the wallpaper: onboarding form, lock screen or connection state, with its error.
// Its contract stays a stub: `profile` and `preferences` are typed in src/svelte/infra (migration debt).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessExperienceContract } from "./access-experience.contract.ts";

export const AccessExperience = defineComposition({
  id: "access-experience",
  purpose: "Create an identity in one step and choose appearance in the second, without a confirmation step.",
  owner: { entry: "AccessExperience.svelte" },
  uses: ["access-form", "feedback", "lock-screen", "stack-layout", "wallpaper"], approval: "required", contract: AccessExperienceContract,
} as const);
