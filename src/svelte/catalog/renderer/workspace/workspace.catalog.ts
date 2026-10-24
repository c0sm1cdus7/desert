// Workspace: the renderer entry of a view program, forwarding its resolved view, panel and events to the view workspace.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { WorkspaceContract } from "./workspace.contract.ts";

export const Workspace = defineComposition({
  id: "workspace",
  purpose: "Mount the workspace of a view program with its resolved view, panel, error and events.",
  owner: { entry: "Workspace.svelte" },
  uses: ["view-workspace"], approval: "none", contract: WorkspaceContract,
} as const);
