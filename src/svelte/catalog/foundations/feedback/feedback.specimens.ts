// One witness of Feedback in its only state.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FeedbackSpecimens = [
  { state: "default", props: { text: "Your changes were saved." } },
] as const satisfies readonly CatalogSpecimen<"feedback">[];
