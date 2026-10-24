// Catalog props come from closed contracts: an exclusive variant cannot take another variant's props.
import type { CatalogProps } from "../src/svelte/catalog/types.d.ts";

const change = (_: string) => {};
const masked: CatalogProps<"text-input"> = { primitive: "input.text", label: "Amount", onchange: change,
  mask: { kind: "decimal", locale: "en-US", scale: 2 } };
const multiline: CatalogProps<"text-input"> = { primitive: "input.multiline", label: "Notes", onchange: change };
// @ts-expect-error a multiline editor takes no mask
const maskedMultiline: CatalogProps<"text-input"> = { primitive: "input.multiline", label: "Notes", onchange: change, mask: { kind: "decimal", locale: "en-US", scale: 2 } };
// @ts-expect-error props outside the contract are refused
const presentation: CatalogProps<"text-input"> = { primitive: "input.text", label: "Name", onchange: change, class: "wide" };
const ready: CatalogProps<"image"> = { source: "https://example.test/a.png", alt: "A", onready: () => {} };
void [masked, multiline, maskedMultiline, presentation, ready];
// Field, the rename of text-input: the same guarantees, and a trigger takes no written value.
const field = { label: "Amount", labelVisibility: "visible", required: false, invalid: false, disabled: false, measure: "amount" } as const;
const fieldMasked: CatalogProps<"field"> = { ...field, primitive: "input.text", purpose: "text", value: "", clear: true, onchange: change,
  mask: { kind: "decimal", locale: "en-US", scale: 2 } };
const fieldMultiline: CatalogProps<"field"> = { ...field, primitive: "input.multiline", value: "", onchange: change };
// @ts-expect-error a multiline field takes no mask
const fieldMaskedMultiline: CatalogProps<"field"> = { ...field, primitive: "input.multiline", value: "", mask: { kind: "decimal", locale: "en-US", scale: 2 } };
// @ts-expect-error a trigger takes no written value
const fieldTriggerValue: CatalogProps<"field"> = { ...field, primitive: "trigger", value: "x", display: { kind: "text", text: "x", placeholder: false },
  disclosure: { id: "a", controls: "b", expanded: false, haspopup: "listbox" } };
// @ts-expect-error props outside the contract are refused
const fieldPresentation: CatalogProps<"field"> = { ...field, primitive: "input.text", purpose: "text", value: "", clear: true, class: "wide" };
void [fieldMasked, fieldMultiline, fieldMaskedMultiline, fieldTriggerValue, fieldPresentation];
