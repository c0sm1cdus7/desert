// CatalogWorkspaceContent: the body of the catalog workspace, either the retained visited views of a view program or
// the public catalog's browse, exercises and bank places.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogWorkspaceContentContract } from "./catalog-workspace-content.contract.ts";

export const CatalogWorkspaceContent = defineComposition({
  id: "catalog-workspace-content",
  purpose: "Show the body of the catalog workspace: the visited views of a program, or the public catalog's browse, exercises and bank places.",
  owner: { entry: "CatalogWorkspaceContent.svelte" },
  uses: ["catalog-detail", "catalog-home", "local-exercises", "public-catalog-bank", "retained-place", "view-content"], approval: "none", contract: CatalogWorkspaceContentContract,
} as const);
