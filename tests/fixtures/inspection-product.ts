import { Components, composeProduct, defineView, compile } from "../../src/index.ts";
import { Modules, Destinations } from "../../products/notebook/src/modules.ts";
import { WorkspaceView } from "../../products/notebook/src/views/workspace.view.ts";
import { NavigationView } from "../../products/notebook/src/views/navigation.view.ts";
import { HumanNotebook, AgentNotebook } from "../../products/notebook/src/exposures.ts";
import { messageCatalog } from "../../src/messages/catalog.ts";
import { Messages as NotebookMessages } from "../../products/notebook/src/messages/keys.ts";
import { fixtureSentences } from "./message-sentences.ts";
import { fixtureText } from "./messages.ts";

// The notebook's modules and views name the notebook's messages (m.notes.*, m.notebook.*); the catalog destination names
// fixture sentences. The inspection product's catalog is the notebook's, extended by the fixture namespace.
const InspectionMessages = messageCatalog({ en: { ...NotebookMessages.bundles.en, fixture: fixtureSentences } } as const);

const CatalogView = defineView({ name: "visual-catalog", content: [
  Components.Header({ title: fixtureText.visualCatalog, subtitle: fixtureText.isolatedSharedComponentsNoProductCommands }),
  Components.VisualCatalog(),
] });
const CatalogJourney = { id: "visual-catalog", kind: "presentation", view: CatalogView, outputs: [] } as const;
const CatalogDestination = { id: "visual-catalog", label: fixtureText.visualCatalog, icon: "catalog", entryJourney: CatalogJourney } as const;

export const InspectionProduct = composeProduct({ messages: InspectionMessages,
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
