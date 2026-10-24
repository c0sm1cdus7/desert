// One witness: the clock at the moment it is shown.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ClockSpecimens = [
  { state: "default", props: {} },
] as const satisfies readonly CatalogSpecimen<"clock">[];
