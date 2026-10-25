// Availability: a live status line that says whether a capability is ready, unavailable or still being checked,
// with a check, a warning or a spinner beside the sentence.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { AvailabilityContract } from "./availability.contract.ts";

export const Availability = defineFoundation({
  id: "availability",
  purpose: { key: "availability.purpose" }, messages: ["availability.purpose"],
  owner: { entry: "Availability.svelte" },
  shape: "none", states: ["ready", "unavailable", "unknown"], renders: ["availability"], approval: "required", contract: AvailabilityContract,
} as const);
