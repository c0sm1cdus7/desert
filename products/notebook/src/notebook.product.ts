import { composeProduct } from "desert-sdk/src/index.ts";
import { Modules, Destinations } from "./modules.ts";
import { WorkspaceView } from "./views/workspace.view.ts";
import { NavigationView } from "./views/navigation.view.ts";
import { HumanNotebook, AgentNotebook } from "./exposures.ts";

export const NotebookProduct = composeProduct({
  id: "notebook", label: "Notebook", modules: Modules,
  views: [WorkspaceView, NavigationView], workspace: WorkspaceView,
  exposures: [HumanNotebook, AgentNotebook], entry: Destinations.Notes,
  navigation: [{ destination: Destinations.Notes, group: "Explore", purpose: "content" }],
});

export const Notebook = NotebookProduct.definition;
export const NotebookViewProgram = NotebookProduct.viewProgram;
