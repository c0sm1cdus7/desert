// SharedOwnerCatalog: the inspection page of one shared owner: its live example, its composition parts and its contract.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SharedOwnerCatalogContract } from "./shared-owner-catalog.contract.ts";

export const SharedOwnerCatalog = defineComposition({
  id: "shared-owner-catalog",
  purpose: { key: "sharedOwnerCatalog.purpose" },
  messages: ["sharedOwnerCatalog.purpose", "sharedOwnerCatalog.example", "sharedOwnerCatalog.parts", "sharedOwnerCatalog.contract",
    "sharedOwnerCatalog.owner", "sharedOwnerCatalog.source", "sharedOwnerCatalog.back"],
  owner: { entry: "SharedOwnerCatalog.svelte" },
  uses: ["bar", "column", "information", "list", "place-heading", "row", "shared-owner-specimen", "stack-layout", "view-region"],
  approval: "none", contract: SharedOwnerCatalogContract,
} as const);
