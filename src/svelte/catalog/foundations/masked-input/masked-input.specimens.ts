// One witness of MaskedInput per state: a decimal amount being edited, rejected and unavailable.
import type { CatalogSpecimen } from "../../types.d.ts";

export const MaskedInputSpecimens = [
  { state: "default", props: { value: "1234.5", mask: { kind: "decimal", locale: "en-US", scale: 2 },
    "aria-label": "Amount", onvalue: () => {} } },
  { state: "invalid", props: { value: "0", mask: { kind: "decimal", locale: "en-US", scale: 2 },
    "aria-label": "Amount", "aria-invalid": true, onvalue: () => {} } },
  { state: "disabled", props: { value: "1234.5", mask: { kind: "decimal", locale: "en-US", scale: 2 },
    "aria-label": "Amount", disabled: true, onvalue: () => {} } },
] as const satisfies readonly CatalogSpecimen<"masked-input">[];
