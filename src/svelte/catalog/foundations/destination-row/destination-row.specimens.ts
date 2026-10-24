// One witness of DestinationRow per state: a destination it opens, and one it cannot open, with the reason.
import type { CatalogSpecimen } from "../../types.d.ts";

export const DestinationRowSpecimens = [
  { state: "available", props: { destination: "notes", label: "Notes", icon: "catalog", available: true, open: () => {} } },
  { state: "unavailable", props: { destination: "archive", label: "Archive", icon: "archive", available: false,
    reason: "Archive opens once a note is saved.", open: () => {} } },
] as const satisfies readonly CatalogSpecimen<"destination-row">[];
