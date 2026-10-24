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
