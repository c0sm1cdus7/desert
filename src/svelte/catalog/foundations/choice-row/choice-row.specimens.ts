// One witness of ChoiceRow per state: a plain row, a row with a description, and a disabled row.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ChoiceRowSpecimens = [
  { state: "default", props: { id: "choice-row-specimen-weekly", labelId: "choice-row-specimen-weekly-label", label: "Weekly",
    disabled: false } },
  { state: "described", props: { id: "choice-row-specimen-daily", labelId: "choice-row-specimen-daily-label",
    descriptionId: "choice-row-specimen-daily-description", label: "Daily", description: "A summary every morning.", disabled: false } },
  { state: "disabled", props: { id: "choice-row-specimen-hourly", labelId: "choice-row-specimen-hourly-label", label: "Hourly",
    disabled: true } },
] as const satisfies readonly CatalogSpecimen<"choice-row">[];
