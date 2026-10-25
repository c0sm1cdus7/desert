// ViewProduct: the renderer entry of a view program's product page, mounting its browser session and workspace.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewProductContract } from "./view-product.contract.ts";

export const ViewProduct = defineComposition({
  id: "view-product",
  purpose: { key: "viewProduct.purpose" },
  messages: ["viewProduct.purpose"],
  owner: { entry: "ViewProduct.svelte" },
  uses: ["view-product-content"], approval: "none", contract: ViewProductContract,
} as const);
