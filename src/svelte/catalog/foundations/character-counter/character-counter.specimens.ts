// One witness of CharacterCounter per state: no limit, within the limit, and over it.
import type { CatalogSpecimen } from "../../types.d.ts";

export const CharacterCounterSpecimens = [
  { state: "unlimited", props: { id: "character-counter-specimen-unlimited", value: "Weekly plan" } },
  { state: "remaining", props: { id: "character-counter-specimen-remaining", value: "Weekly plan", maxLength: 40 } },
  { state: "exceeded", props: { id: "character-counter-specimen-exceeded", value: "A weekly plan for the whole team", maxLength: 20 } },
] as const satisfies readonly CatalogSpecimen<"character-counter">[];
