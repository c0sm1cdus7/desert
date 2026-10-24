// ViewProductContent: mounts the browser session of a view program and renders its workspace from the live snapshot.
// Its contract stays a stub: `access` is `Pick<AccessClient, "lock">`, which has no named non-visual type (migration debt).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewProductContentContract } from "./view-product-content.contract.ts";

export const ViewProductContent = defineComposition({
  id: "view-product-content",
  purpose: "Run a view program's browser session and render its workspace from the live snapshot.",
  owner: { entry: "ViewProductContent.svelte", parts: ["activity-host.ts"] },
  uses: ["view-workspace"], approval: "none", contract: ViewProductContentContract,
} as const);
