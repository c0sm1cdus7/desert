// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SummaryWidgetContract } from "./summary-widget.contract.ts";

export const SummaryWidget = defineComposition({
  id: "summary-widget",
  purpose: "Show module status at a glance and open its destination.",
  owner: { entry: "SummaryWidget.svelte" },
  uses: [], approval: "required", contract: SummaryWidgetContract,
} as const);
