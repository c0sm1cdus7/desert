// SummaryWidget: a pressable card that counts a collection by one field, with loading, reconnect and offline states.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SummaryWidgetContract } from "./summary-widget.contract.ts";

export const SummaryWidget = defineComposition({
  id: "summary-widget",
  purpose: "Show module status at a glance and open its destination.",
  owner: { entry: "SummaryWidget.svelte" },
  uses: [], approval: "required", contract: SummaryWidgetContract,
} as const);
