// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DateControlContract } from "./date-control.contract.ts";

export const DateControl = defineFoundation({
  id: "date-control",
  purpose: "Declared as found at the start of the migration: DateControl.svelte.",
  owner: { entry: "DateControl.svelte", parts: ["DateCalendar.svelte"], vendor: ["calendar"] },
  shape: "radius", states: ["default"], approval: "required", contract: DateControlContract,
} as const);
