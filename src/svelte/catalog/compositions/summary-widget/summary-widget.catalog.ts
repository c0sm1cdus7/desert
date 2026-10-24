// SummaryWidget: a pressable card that counts a collection by one field, with loading, reconnect and offline states.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SummaryWidgetContract } from "./summary-widget.contract.ts";

export const SummaryWidget = defineComposition({
  id: "summary-widget",
  purpose: { key: "summaryWidget.purpose" },
  messages: ["summaryWidget.purpose", "summaryWidget.open", "summaryWidget.loading", "summaryWidget.reconnect", "summaryWidget.reading", "summaryWidget.segment", "summaryWidget.truncated", "summaryWidget.offlineLoaded", "summaryWidget.offlineUnavailable"],
  owner: { entry: "SummaryWidget.svelte" },
  uses: ["card", "loading", "meter", "text"], approval: "required", contract: SummaryWidgetContract,
} as const);
