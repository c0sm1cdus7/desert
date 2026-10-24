// One witness of ChoiceItem per state: a title alone, and a title with its description.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ChoiceItemSpecimens = [
  { state: "label", props: { label: "Weekly", labelId: "choice-item-specimen-weekly-label" } },
  { state: "described", props: { label: "Monthly", labelId: "choice-item-specimen-monthly-label",
    description: "One summary on the first day of each month", descriptionId: "choice-item-specimen-monthly-description" } },
] as const satisfies readonly CatalogSpecimen<"choice-item">[];
