// Workspace: the renderer entry of a view program, forwarding its resolved view, panel and events to the view workspace.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { WorkspaceContract } from "./workspace.contract.ts";

export const Workspace = defineComposition({
  id: "workspace",
  purpose: { key: "workspace.purpose" },
  messages: ["workspace.purpose"],
  owner: { entry: "Workspace.svelte" },
  uses: ["view-workspace"], approval: "none", contract: WorkspaceContract,
} as const);
