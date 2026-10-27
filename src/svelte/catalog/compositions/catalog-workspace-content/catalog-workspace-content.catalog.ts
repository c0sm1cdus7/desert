// CatalogWorkspaceContent: the body of the catalog workspace, either the retained visited views of a view program or
// the public catalog's browse, exercises and bank places, each in a view region.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogWorkspaceContentContract } from "./catalog-workspace-content.contract.ts";

export const CatalogWorkspaceContent = defineComposition({
  id: "catalog-workspace-content",
  purpose: { key: "catalogWorkspaceContent.purpose" },
  messages: ["catalogWorkspaceContent.purpose"],
  owner: { entry: "CatalogWorkspaceContent.svelte" },
  uses: ["catalog-detail", "catalog-home", "local-exercises", "public-catalog-bank", "view-content", "view-region"], approval: "none",
  contract: CatalogWorkspaceContentContract,
} as const);
