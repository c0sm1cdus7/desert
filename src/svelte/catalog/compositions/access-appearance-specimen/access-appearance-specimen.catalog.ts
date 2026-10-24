// AccessAppearanceSpecimen: a bank specimen that mounts one access or appearance owner with local example state;
// nothing it does reaches authentication or saved preferences.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AccessAppearanceSpecimenContract } from "./access-appearance-specimen.contract.ts";

export const AccessAppearanceSpecimen = defineComposition({
  id: "access-appearance-specimen",
  purpose: "Exercise one access or appearance owner in the bank with local example state and no authentication or saved preference.",
  owner: { entry: "AccessAppearanceSpecimen.svelte" },
  uses: ["access-experience", "appearance-preferences", "appearance-preview", "avatar-shuffle", "feedback", "lock-screen", "seed-avatar", "wallpaper"], approval: "none", contract: AccessAppearanceSpecimenContract,
} as const);
