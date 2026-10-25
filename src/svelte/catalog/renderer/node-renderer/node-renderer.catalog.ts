// NodeRenderer: the dispatcher of resolved nodes. Each node kind has one branch, which mounts the piece the generated
// table names for that kind and translates its callbacks into node events.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { NodeRendererContract } from "./node-renderer.contract.ts";

export const NodeRenderer = defineComposition({
  id: "node-renderer",
  purpose: { key: "nodeRenderer.purpose" },
  messages: ["nodeRenderer.purpose"],
  owner: { entry: "NodeRenderer.svelte" },
  uses: ["action", "availability", "catalog-card", "catalog-detail", "catalog-home", "collection", "context-panel", "date-control", "drawer", "facts", "field", "fields", "files", "labels-control", "media-control", "money-control", "options-control", "popover-control", "problem", "review", "select-control"], dispatch: "resolved-node", approval: "none", contract: NodeRendererContract,
} as const);
