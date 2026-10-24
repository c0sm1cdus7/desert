// One witness of Availability per state.
import type { CatalogSpecimen } from "../../types.d.ts";

export const AvailabilitySpecimens = [
  { state: "ready", props: { state: "ready", label: "Sync is ready" } },
  { state: "unavailable", props: { state: "unavailable", label: "Sync is unavailable offline" } },
  { state: "unknown", props: { state: "unknown", label: "Checking sync…" } },
] as const satisfies readonly CatalogSpecimen<"availability">[];
