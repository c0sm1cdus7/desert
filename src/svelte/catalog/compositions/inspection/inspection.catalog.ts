// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InspectionContract } from "./inspection.contract.ts";

export const Inspection = defineComposition({
  id: "inspection",
  purpose: "Browse the local inspection catalog and open one of its records as a detail, without product commands.",
  owner: { entry: "Inspection.svelte", parts: ["inspection-fixture.ts"] },
  uses: ["catalog-detail", "inspection-catalog", "node-renderer", "retained-place", "toolbar"], approval: "none", contract: InspectionContract,
} as const);
