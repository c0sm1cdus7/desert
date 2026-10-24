// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CatalogWorkspaceContentContract } from "./catalog-workspace-content.contract.ts";

export const CatalogWorkspaceContent = defineComposition({
  id: "catalog-workspace-content",
  purpose: "Show the body of the catalog workspace: the visited views of a program, or the public catalog's browse, exercises and bank places.",
  owner: { entry: "CatalogWorkspaceContent.svelte" },
  uses: ["catalog-detail", "catalog-home", "local-exercises", "public-catalog-bank", "retained-place", "view-content"], approval: "none", contract: CatalogWorkspaceContentContract,
} as const);
