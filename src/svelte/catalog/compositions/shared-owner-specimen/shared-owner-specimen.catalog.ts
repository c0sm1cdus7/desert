// SharedOwnerSpecimen: the local, interactive example of one shared catalog owner, with no product commands. An owner
// whose piece merged into a foundation shows that foundation; its example data is the shared-owner-fixtures part.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SharedOwnerSpecimenContract } from "./shared-owner-specimen.contract.ts";

export const SharedOwnerSpecimen = defineComposition({
  id: "shared-owner-specimen",
  purpose: { key: "sharedOwnerSpecimen.purpose" },
  messages: ["sharedOwnerSpecimen.purpose", "sharedOwnerSpecimen.initial", "sharedOwnerSpecimen.interaction", "sharedOwnerSpecimen.layout",
    "sharedOwnerSpecimen.overview", "sharedOwnerSpecimen.gallery", "sharedOwnerSpecimen.state", "sharedOwnerSpecimen.ready",
    "sharedOwnerSpecimen.loading", "sharedOwnerSpecimen.offline", "sharedOwnerSpecimen.openMedia", "sharedOwnerSpecimen.resume",
    "sharedOwnerSpecimen.resumeActivity", "sharedOwnerSpecimen.openTasks", "sharedOwnerSpecimen.openObject", "sharedOwnerSpecimen.openTrash",
    "sharedOwnerSpecimen.connecting", "sharedOwnerSpecimen.reconnect", "sharedOwnerSpecimen.objects", "sharedOwnerSpecimen.actions",
    "sharedOwnerSpecimen.moveToTrash", "sharedOwnerSpecimen.confirmed", "sharedOwnerSpecimen.cancelled", "sharedOwnerSpecimen.back",
    "sharedOwnerSpecimen.commandActivated", "sharedOwnerSpecimen.shuffle", "sharedOwnerSpecimen.foundations", "sharedOwnerSpecimen.fact",
    "sharedOwnerSpecimen.button", "sharedOwnerSpecimen.openFact", "sharedOwnerSpecimen.openButton", "sharedOwnerSpecimen.attention", "sharedOwnerSpecimen.moreActions"],
  owner: { entry: "SharedOwnerSpecimen.svelte", parts: ["shared-owner-fixtures.ts"] },
  uses: ["access-appearance-specimen", "action", "attention-indicator", "attention-list", "attention-status", "avatar", "bar", "choice",
    "collection", "column", "content-flow", "context-properties", "dialog", "information", "list", "media-reference-specimen", "menu",
    "object-state-control", "object-state-row", "reading-content", "reference-specimen", "related-selection", "row",
    "stack-layout", "summary-widget", "surface-specimen", "text", "theme-preview", "view-destination-link", "view-region"],
  approval: "none", contract: SharedOwnerSpecimenContract,
} as const);
