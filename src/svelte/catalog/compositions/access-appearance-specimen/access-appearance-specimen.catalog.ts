// AccessAppearanceSpecimen: a bank specimen that mounts one access or appearance owner with local example state;
// nothing it does reaches authentication or saved preferences.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessAppearanceSpecimenContract } from "./access-appearance-specimen.contract.ts";

export const AccessAppearanceSpecimen = defineComposition({
  id: "access-appearance-specimen",
  purpose: { key: "accessAppearanceSpecimen.purpose" },
  messages: ["accessAppearanceSpecimen.purpose", "accessAppearanceSpecimen.noAuthentication", "accessAppearanceSpecimen.noIdentity",
    "accessAppearanceSpecimen.avatar", "accessAppearanceSpecimen.shuffleAvatar"],
  owner: { entry: "AccessAppearanceSpecimen.svelte" },
  uses: ["access-experience", "appearance-preferences", "avatar", "lock-screen", "text", "theme-preview", "wallpaper"], approval: "none", contract: AccessAppearanceSpecimenContract,
} as const);
