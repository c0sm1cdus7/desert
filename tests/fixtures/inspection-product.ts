import { Components, composeProduct, defineView, compile } from "../../src/index.ts";
import { Modules, Destinations } from "../../products/notebook/src/modules.ts";
import { WorkspaceView } from "../../products/notebook/src/views/workspace.view.ts";
import { NavigationView } from "../../products/notebook/src/views/navigation.view.ts";
import { HumanNotebook, AgentNotebook } from "../../products/notebook/src/exposures.ts";

const CatalogView = defineView({ name: "visual-catalog", content: [
  Components.Header({ title: "Visual catalog", subtitle: "Isolated shared components; no product commands execute here." }),
  Components.VisualCatalog(),
] });
const CatalogJourney = { id: "visual-catalog", kind: "presentation", view: CatalogView, outputs: [] } as const;
const CatalogDestination = { id: "visual-catalog", label: "Visual catalog", icon: "catalog", entryJourney: CatalogJourney } as const;

export const InspectionProduct = composeProduct({
  id: "notebook", label: "Notebook", modules: Modules,
  views: [WorkspaceView, NavigationView, CatalogView], workspace: WorkspaceView,
  journeys: [{ presentation: CatalogJourney }], destinations: [CatalogDestination],
  exposures: [HumanNotebook, AgentNotebook], entry: Destinations.Notes,
  navigation: [
    { destination: Destinations.Notes, group: "Explore", purpose: "content" },
    { destination: CatalogDestination, group: "Developer", purpose: "utility" },
  ],
});

export const InspectionApplication = compile(InspectionProduct);
