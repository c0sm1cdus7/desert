// ViewProductContent: mounts the browser session of a view program and renders its workspace from the live snapshot.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewProductContentContract } from "./view-product-content.contract.ts";

export const ViewProductContent = defineComposition({
  id: "view-product-content",
  purpose: "Run a view program's browser session and render its workspace from the live snapshot.",
  owner: { entry: "ViewProductContent.svelte", parts: ["activity-host.ts"] },
  uses: ["view-workspace"], approval: "none", contract: ViewProductContentContract,
} as const);
