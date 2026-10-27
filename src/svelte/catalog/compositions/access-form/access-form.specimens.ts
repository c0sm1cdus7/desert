// The witness of AccessForm: creating a new identity, at its first step.
import type { CatalogSpecimen } from "../../types.d.ts";

export const AccessFormSpecimens = [
  { state: "default", props: { mode: "initialize", productLabel: "VOID", onsubmit: async () => {} } },
] as const satisfies readonly CatalogSpecimen<"access-form">[];
