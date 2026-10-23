// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { AvailabilityContract } from "./availability.contract.ts";

export const Availability = defineFoundation({
  id: "availability",
  purpose: "Understand whether a capability is ready, unavailable or not yet known.",
  owner: { entry: "Availability.svelte", vendor: ["skeleton", "spinner"] },
  shape: "none", states: ["default"], approval: "required", contract: AvailabilityContract,
} as const);
