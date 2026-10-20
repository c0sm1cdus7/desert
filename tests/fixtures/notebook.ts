import { Notebook } from "../../products/notebook/product.ts";

// Negative compiler tests deliberately mutate raw input, never the authored product.
type MutableInput<T> = T extends string ? string : T extends number ? number
  : T extends object ? { -readonly [Key in keyof T]: MutableInput<T[Key]> } : T;

export function notebookDefinition(): MutableInput<typeof Notebook> {
  return structuredClone(Notebook);
}
