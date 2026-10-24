// Availability: a live status line that says whether a capability is ready, unavailable or still being checked,
// with a check, a warning or a spinner beside the sentence.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { AvailabilityContract } from "./availability.contract.ts";

export const Availability = defineFoundation({
  id: "availability",
  purpose: "Understand whether a capability is ready, unavailable or not yet known.",
  owner: { entry: "Availability.svelte", vendor: ["skeleton", "spinner"] },
  shape: "none", states: ["ready", "unavailable", "unknown"], approval: "required", contract: AvailabilityContract,
} as const);
