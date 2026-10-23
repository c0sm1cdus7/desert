// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessExperienceContract } from "./access-experience.contract.ts";

export const AccessExperience = defineComposition({
  id: "access-experience",
  purpose: "Create an identity in one step and choose appearance in the second, without a confirmation step.",
  owner: { entry: "AccessExperience.svelte" },
  uses: ["access-form", "feedback", "lock-screen", "stack-layout", "wallpaper"], approval: "required", contract: AccessExperienceContract,
} as const);
