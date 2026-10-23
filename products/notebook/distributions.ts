import { clientDistribution, controllerDistribution, localBinding, remoteBinding } from "../../src/index.ts";
import { Dependencies } from "./src/modules.ts";
import { Notebook } from "./product.ts";
import { AgentNotebook, HumanNotebook } from "./surfaces.ts";

export const NotebookService = controllerDistribution({
  id: "notebook-service", product: Notebook, runtime: "node", storage: "postgresql",
  serves: [HumanNotebook, AgentNotebook], provides: [Dependencies.notes],
});

export const NotebookWeb = clientDistribution({
  id: "notebook-web", product: Notebook, surface: HumanNotebook,
  renderer: "svelte-web", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookIOS = clientDistribution({
  id: "notebook-ios", product: Notebook, surface: HumanNotebook,
  renderer: "swiftui-ios", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookCLI = clientDistribution({
  id: "notebook-cli", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookLocal = clientDistribution({
  id: "notebook-local", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [localBinding(Dependencies.notes, "notes-local")],
});
