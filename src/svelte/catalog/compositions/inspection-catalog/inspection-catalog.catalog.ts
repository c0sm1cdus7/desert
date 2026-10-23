// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InspectionCatalogContract } from "./inspection-catalog.contract.ts";

export const InspectionCatalog = defineComposition({
  id: "inspection-catalog",
  purpose: "Discover foundations and compositions through the same action rows and destination navigation used by the product.",
  owner: { entry: "InspectionCatalog.svelte", parts: ["purpose.ts"] },
  uses: ["control-bench", "destination-row", "grouped-panel", "place-header", "public-catalog-bank-specimen", "shared-owner-catalog", "specimen-group", "specimen-row", "specimen-unavailable", "stack-layout", "toolbar-layout"], approval: "none", contract: InspectionCatalogContract,
} as const);
