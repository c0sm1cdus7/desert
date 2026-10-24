// One witness of MeasuredField per state (default, invalid, disabled) for the measure of each control family.
import type { CatalogSpecimen } from "../../types.d.ts";

export const MeasuredFieldSpecimens = [
  { state: "default", variants: { kind: "input.text" }, props: { kind: "input.text" } },
  { state: "default", variants: { kind: "input.multiline" }, props: { kind: "input.multiline" } },
  { state: "default", variants: { kind: "control.select" }, props: { kind: "control.select" } },
  { state: "default", variants: { kind: "control.date" }, props: { kind: "control.date" } },
  { state: "default", variants: { kind: "control.money" }, props: { kind: "control.money" } },
  { state: "invalid", variants: { kind: "input.text" }, props: { kind: "input.text", invalid: true } },
  { state: "invalid", variants: { kind: "input.multiline" }, props: { kind: "input.multiline", invalid: true } },
  { state: "invalid", variants: { kind: "control.select" }, props: { kind: "control.select", invalid: true } },
  { state: "invalid", variants: { kind: "control.date" }, props: { kind: "control.date", invalid: true } },
  { state: "invalid", variants: { kind: "control.money" }, props: { kind: "control.money", invalid: true } },
  { state: "disabled", variants: { kind: "input.text" }, props: { kind: "input.text", disabled: true } },
  { state: "disabled", variants: { kind: "input.multiline" }, props: { kind: "input.multiline", disabled: true } },
  { state: "disabled", variants: { kind: "control.select" }, props: { kind: "control.select", disabled: true } },
  { state: "disabled", variants: { kind: "control.date" }, props: { kind: "control.date", disabled: true } },
  { state: "disabled", variants: { kind: "control.money" }, props: { kind: "control.money", disabled: true } },
] as const satisfies readonly CatalogSpecimen<"measured-field">[];
