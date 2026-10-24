// Inspection: the local inspection catalog, kept mounted while one of its records is read as a detail.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InspectionContract } from "./inspection.contract.ts";

export const Inspection = defineComposition({
  id: "inspection",
  purpose: { key: "inspection.purpose" },
  messages: ["inspection.purpose", "inspection.example", "inspection.back"],
  owner: { entry: "Inspection.svelte", parts: ["inspection-fixture.ts"] },
  uses: ["catalog-detail", "inspection-catalog", "node-renderer", "toolbar", "view-region"], approval: "none", contract: InspectionContract,
} as const);
