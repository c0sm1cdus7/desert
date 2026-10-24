// SearchField: the search well of a toolbar, with a leading search icon and a clear button. Its contract stays a
// stub: the entry exposes its input element (`ref`, `onready`), which the closed contract subset cannot express.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SearchFieldContract } from "./search-field.contract.ts";

export const SearchField = defineFoundation({
  id: "search-field",
  purpose: "Type a query in a search well with a search icon and a clear button.",
  owner: { entry: "SearchField.svelte", parts: ["search-field.css"] },
  shape: "radius", states: ["empty", "value", "disabled"], approval: "required", contract: SearchFieldContract,
} as const);
