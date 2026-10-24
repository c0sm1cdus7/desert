// AccessExperience: the access screen over the wallpaper: onboarding form, lock screen or connection state, with its error.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessExperienceContract } from "./access-experience.contract.ts";

export const AccessExperience = defineComposition({
  id: "access-experience",
  purpose: { key: "accessExperience.purpose" },
  messages: ["accessExperience.purpose", "accessExperience.access", "accessExperience.connecting", "accessExperience.unavailable",
    "accessExperience.tryAgain"],
  owner: { entry: "AccessExperience.svelte" },
  uses: ["access-form", "action", "column", "heading", "inline", "lock-screen", "stack-layout", "surface", "text"], approval: "required", contract: AccessExperienceContract,
} as const);
