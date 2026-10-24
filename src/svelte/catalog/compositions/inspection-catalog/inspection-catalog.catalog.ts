// InspectionCatalog: the component bank. An index of rows by group opens one entry (its specimens by state, its contract
// and its composition parts) or one shared owner's page; it heads itself unless a host already does.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InspectionCatalogContract } from "./inspection-catalog.contract.ts";

export const InspectionCatalog = defineComposition({
  id: "inspection-catalog",
  purpose: { key: "inspectionCatalog.purpose" },
  messages: ["inspectionCatalog.purpose", "inspectionCatalog.title", "inspectionCatalog.subtitle", "inspectionCatalog.parts",
    "inspectionCatalog.back"],
  owner: { entry: "InspectionCatalog.svelte", parts: ["purpose.ts"] },
  uses: ["bar", "column", "control-bench", "list", "place-heading", "public-catalog-bank-specimen", "row", "shared-owner-catalog",
    "specimen-group", "specimen-row", "specimen-unavailable", "stack-layout", "view-region"],
  approval: "none", contract: InspectionCatalogContract,
} as const);
