// SharedOwnerCatalog: the inspection page of one shared owner: its live example, its composition parts and its contract.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SharedOwnerCatalogContract } from "./shared-owner-catalog.contract.ts";

export const SharedOwnerCatalog = defineComposition({
  id: "shared-owner-catalog",
  purpose: "Show one shared owner's live example, the parts it is composed of, and its contract: who owns it and where its source lives.",
  owner: { entry: "SharedOwnerCatalog.svelte" },
  uses: ["destination-row", "grouped-panel", "information", "place-header", "shared-owner-specimen", "stack-layout", "toolbar-layout"], approval: "none", contract: SharedOwnerCatalogContract,
} as const);
