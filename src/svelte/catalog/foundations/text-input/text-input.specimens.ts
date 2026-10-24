// One witness per state of TextInput (empty, written, invalid, disabled) as a single line and as a multiline editor with
// its counter, and the masked state, which only a single line has.
import type { CatalogSpecimen } from "../../types.d.ts";

export const TextInputSpecimens = [
  { state: "empty", variants: { primitive: "input.text" }, props: { primitive: "input.text", label: "Title", value: "", required: true } },
  { state: "empty", variants: { primitive: "input.multiline" }, props: { primitive: "input.multiline", label: "Details", value: "",
    maxLength: 500 } },
  { state: "value", variants: { primitive: "input.text" }, props: { primitive: "input.text", label: "Title", value: "Weekly plan",
    helper: "Shown at the top of the note." } },
  { state: "value", variants: { primitive: "input.multiline" }, props: { primitive: "input.multiline", label: "Details",
    value: "Review the open items before Friday.", maxLength: 500 } },
  { state: "invalid", variants: { primitive: "input.text" }, props: { primitive: "input.text", label: "Identity name", value: "A",
    purpose: "username", invalid: true, error: "Use 3–64 lowercase letters, numbers, dots, hyphens or underscores." } },
  { state: "invalid", variants: { primitive: "input.multiline" }, props: { primitive: "input.multiline", label: "Details", value: "",
    required: true, invalid: true, error: "Write the details of the note.", maxLength: 500 } },
  { state: "disabled", variants: { primitive: "input.text" }, props: { primitive: "input.text", label: "Title", value: "Weekly plan",
    disabled: true } },
  { state: "disabled", variants: { primitive: "input.multiline" }, props: { primitive: "input.multiline", label: "Details",
    value: "Review the open items before Friday.", maxLength: 500, disabled: true } },
  { state: "masked", variants: { primitive: "input.text" }, props: { primitive: "input.text", label: "Amount", value: "1250.5",
    identity: "amount", mask: { kind: "decimal", locale: "en-US", scale: 2 } } },
] as const satisfies readonly CatalogSpecimen<"text-input">[];
