// DateControl: a date field whose well opens a month calendar, anchored beside it or as a sheet when space is short.
// Choosing a day emits the change; an optional date can also be cleared.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DateControlContract } from "./date-control.contract.ts";

export const DateControl = defineFoundation({
  id: "date-control",
  purpose: "Choose one day from a month calendar opened from a labelled field well, within optional bounds.",
  owner: { entry: "DateControl.svelte", parts: ["DateCalendar.svelte"], vendor: ["calendar"] },
  shape: "radius", states: ["empty", "value", "required", "disabled"], renders: ["control.date"], approval: "required", contract: DateControlContract,
} as const);
