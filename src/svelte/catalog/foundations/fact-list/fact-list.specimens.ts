// The empty pane; rows come from fact-row's own specimens.
import type { CatalogSpecimen } from "../../types.d.ts";

export const FactListSpecimens = [{ state: "default", props: {} }] as const satisfies readonly CatalogSpecimen<"fact-list">[];
