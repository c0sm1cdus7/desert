import { Components, composeProduct, defineView, compile } from "../../src/index.ts";
import { Modules, Destinations } from "../../products/notebook/src/modules.ts";
import { WorkspaceView } from "../../products/notebook/src/views/workspace.view.ts";
import { NavigationView } from "../../products/notebook/src/views/navigation.view.ts";
import { HumanNotebook, AgentNotebook } from "../../products/notebook/src/exposures.ts";
import { FixtureMessages, fixtureText } from "./messages.ts";

const CatalogView = defineView({ name: "visual-catalog", content: [
  Components.Header({ title: fixtureText.visualCatalog, subtitle: fixtureText.isolatedSharedComponentsNoProductCommands }),
  Components.VisualCatalog(),
] });
const CatalogJourney = { id: "visual-catalog", kind: "presentation", view: CatalogView, outputs: [] } as const;
const CatalogDestination = { id: "visual-catalog", label: fixtureText.visualCatalog, icon: "catalog", entryJourney: CatalogJourney } as const;

export const InspectionProduct = composeProduct({ messages: FixtureMessages,
  id: "notebook", label: fixtureText.notebook, modules: Modules,
  views: [WorkspaceView, NavigationView, CatalogView], workspace: WorkspaceView,
  journeys: [{ presentation: CatalogJourney }], destinations: [CatalogDestination],
  exposures: [HumanNotebook, AgentNotebook], entry: Destinations.Notes,
  navigation: [
    { destination: Destinations.Notes, group: fixtureText.explore, purpose: "content" },
    { destination: CatalogDestination, group: fixtureText.developer, purpose: "utility" },
  ],
});

export const InspectionApplication = compile(InspectionProduct);
