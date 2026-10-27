// One witness per kind: skeleton lines and a spinner, each announced by its label.
import type { CatalogSpecimen } from "../../types.d.ts";

export const LoadingSpecimens = [
  { state: "default", variants: { kind: "lines" }, props: { kind: "lines", label: "Loading content\u2026" } },
  { state: "default", variants: { kind: "spinner" }, props: { kind: "spinner", label: "Loading content\u2026" } },
] as const satisfies readonly CatalogSpecimen<"loading">[];
