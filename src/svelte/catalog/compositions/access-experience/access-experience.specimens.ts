// The witness of AccessExperience: a first visit, onboarding a new identity over the wallpaper.
import type { CatalogSpecimen } from "../../types.d.ts";

export const AccessExperienceSpecimens = [
  { state: "default", props: {
    productLabel: "VOID",
    current: { state: { kind: "onboarding" }, busy: false, error: null },
    authenticate: async () => {}, refresh: async () => {},
  } },
] as const satisfies readonly CatalogSpecimen<"access-experience">[];
