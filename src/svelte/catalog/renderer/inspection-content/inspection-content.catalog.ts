// InspectionContent: the visual catalog inspection, which a caller binds to reveal one entry. Its contract stays a stub:
// `catalog` is typed by PublicBankInput from src/svelte/infra and `revealEntry` returns an HTMLElement (migration debt).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { InspectionContentContract } from "./inspection-content.contract.ts";

export const InspectionContent = defineComposition({
  id: "inspection-content",
  purpose: "Mount the visual catalog inspection and reveal one of its entries for a caller that binds it.",
  owner: { entry: "InspectionContent.svelte" },
  uses: ["inspection"], approval: "none", contract: InspectionContentContract,
} as const);
