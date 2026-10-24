// Meter: a total split into labelled segments: the total in the display role, a proportional bar and its legend.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MeterContract } from "./meter.contract.ts";

export const Meter = defineFoundation({
  id: "meter",
  purpose: "Show a total split into labelled segments: the total, a bar proportional to each segment and the legend.",
  owner: { entry: "Meter.svelte" },
  shape: "radius", states: ["default"],
  approval: "required", contract: MeterContract,
} as const);
