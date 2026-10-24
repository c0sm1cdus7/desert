// One witness of Action per state and emphasis: ready, unavailable with its reason, and pending.
import type { CatalogSpecimen } from "../../types.d.ts";

export const ActionSpecimens = [
  { state: "ready", variants: { emphasis: "primary" }, props: { label: "Save", icon: "save", emphasis: "primary" } },
  { state: "ready", variants: { emphasis: "secondary" }, props: { label: "Search", icon: "search", emphasis: "secondary" } },
  { state: "unavailable", variants: { emphasis: "primary" },
    props: { label: "Save", icon: "save", emphasis: "primary", state: "unavailable", reason: "Nothing has changed yet" } },
  { state: "unavailable", variants: { emphasis: "secondary" },
    props: { label: "Archive", icon: "archive", emphasis: "secondary", state: "unavailable", reason: "Archived records stay read-only" } },
  { state: "pending", variants: { emphasis: "primary" }, props: { label: "Save", icon: "save", emphasis: "primary", state: "pending" } },
  { state: "pending", variants: { emphasis: "secondary" }, props: { label: "Retry", icon: "retry", emphasis: "secondary", state: "pending" } },
] as const satisfies readonly CatalogSpecimen<"action">[];
