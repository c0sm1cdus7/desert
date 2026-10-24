// InspectionContent: the visual catalog inspection, which a caller binds to reveal one entry.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InspectionContentContract } from "./inspection-content.contract.ts";

export const InspectionContent = defineComposition({
  id: "inspection-content",
  purpose: { key: "inspectionContent.purpose" },
  messages: ["inspectionContent.purpose"],
  owner: { entry: "InspectionContent.svelte" },
  uses: ["inspection"], approval: "none", contract: InspectionContentContract,
} as const);
