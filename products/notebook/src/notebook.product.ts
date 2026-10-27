import { composeProduct } from "desert-sdk/src/index.ts";
import { Modules, Destinations } from "./modules.ts";
import { WorkspaceView } from "./views/workspace.view.ts";
import { NavigationView } from "./views/navigation.view.ts";
import { HumanNotebook, AgentNotebook } from "./exposures.ts";
import { Messages, m } from "./messages/keys.ts";

export const NotebookProduct = composeProduct({
  id: "notebook", label: m.notebook.label, messages: Messages, modules: Modules,
  views: [WorkspaceView, NavigationView], workspace: WorkspaceView,
  exposures: [HumanNotebook, AgentNotebook], entry: Destinations.Notes,
  navigation: [{ destination: Destinations.Notes, group: m.notebook.explore, purpose: "content" }],
});

export const Notebook = NotebookProduct.definition;
export const NotebookViewProgram = NotebookProduct.viewProgram;
