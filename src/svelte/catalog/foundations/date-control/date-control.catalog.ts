// DateControl: a date field whose well opens a month calendar through Popover, anchored beside it or as a sheet when
// space is short; the calendar header holds the month and its navigation. Choosing a day emits the change; an optional
// date can also be cleared.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DateControlContract } from "./date-control.contract.ts";

export const DateControl = defineFoundation({
  id: "date-control",
  purpose: "Choose one day from a month calendar opened from a labelled field well, within optional bounds.",
  messages: ["dateControl.previousMonth", "dateControl.nextMonth", "dateControl.clearDate", "dateControl.noDate"],
  owner: { entry: "DateControl.svelte", parts: ["DateCalendar.svelte", "date-control.css"], vendor: ["calendar"], mechanisms: ["surface-focus"] },
  shape: "radius", states: ["empty", "value", "required", "disabled"], renders: ["control.date"], approval: "required", contract: DateControlContract,
} as const);
