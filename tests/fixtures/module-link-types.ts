import { composeProduct, defineModule, moduleIndex, view, viewOutput, viewPorts, ViewVersion, type View } from "../../src/index.ts";
import { WorkspaceView, NavigationView } from "./workspace-view.ts";
import { FixtureMessages, fixtureText } from "./messages.ts";

const ports = viewPorts({ inputs: {}, outputs: ["open"] });
const Home = { version: ViewVersion, id: "home", outputs: ports.outputs,
  topDock: { kind: "toolbar", actions: [{ output: ports.output.open, label: fixtureText.open, icon: "open" }] },
  content: [],
} as const satisfies View;
const Detail = { version: ViewVersion, id: "detail", outputs: ["close"], content: [] } as const satisfies View;
const Inspect = { id: "inspect", kind: "presentation", view: Detail, outputs: [
  { ...viewOutput(Detail, "close"), action: { kind: "close" } },
] } as const;
const Browse = { id: "browse", kind: "presentation", view: Home, outputs: [
  { ...viewOutput(Home, "open"), action: { kind: "journey", journey: Inspect } },
] } as const;
const Destination = { id: "home", label: fixtureText.home, icon: "open", entryJourney: Browse } as const;
const source = { id: "example", views: [Home, Detail], journeys: [{ presentation: Browse }, { presentation: Inspect }],
  destinations: [Destination], exports: { views: { Home }, journeys: { browse: Browse }, destinations: { home: Destination } },
} as const;
const Module = defineModule(source);
const Modules = moduleIndex([Module]);
const mounted = view(Home);
const sameId: "home" = mounted.id;
const sameOutput: "open" = mounted.outputs[0];
const stillLinked = viewOutput(mounted, "open");
const publicViewId: "home" = Modules.views.Home.id;
const publicJourneyId: "browse" = Modules.journeys.browse.id;
const publicOwner: "example" = Modules.destinations.home.owner;

// @ts-expect-error A module cannot export an unowned View identity.
defineModule({ ...source, exports: { views: { Missing: { ...Home, id: "missing" } } } });
// @ts-expect-error Export kinds are distinct even when another kind has that identity.
defineModule({ ...source, exports: { views: { Browse } } });
// @ts-expect-error Local presentation View links use the module's actual objects, never IDs.
defineModule({ ...source, journeys: [{ presentation: { ...Browse, view: "home" } }, { presentation: Inspect }] });
// @ts-expect-error Every output names one of that exact View's declared output ports.
defineModule({ ...source, journeys: [{ presentation: { ...Browse, outputs: [{ view: Home, output: "typo", action: { kind: "close" } }] } }, { presentation: Inspect }] });
// @ts-expect-error A valid output name belonging to another View is still a foreign port.
defineModule({ ...source, journeys: [{ presentation: { ...Browse, outputs: [{ view: Home, output: "close", action: { kind: "close" } }] } }, { presentation: Inspect }] });
// @ts-expect-error Output bindings cannot target an unknown local View.
defineModule({ ...source, journeys: [{ presentation: { ...Browse, outputs: [{ view: { ...Home, id: "missing" }, output: "open", action: { kind: "close" } }] } }, { presentation: Inspect }] });
// @ts-expect-error Action links cannot use serialized journey IDs.
defineModule({ ...source, journeys: [{ presentation: { ...Browse, outputs: [{ ...viewOutput(Home, "open"), action: { kind: "journey", journey: "inspect" } }] } }, { presentation: Inspect }] });
// @ts-expect-error A destination cannot name an absent activity.
defineModule({ ...source, destinations: [{ ...Destination, entryJourney: { ...Browse, id: "missing" } }] });
// @ts-expect-error Side-view references cannot use serialized IDs.
defineModule({ ...source, views: [{ ...Home, rightDock: { kind: "view", view: "detail" } }, Detail] });
// @ts-expect-error Toolbar consumers can only emit the View's declared outputs.
defineModule({ ...source, views: [{ ...Home, topDock: { kind: "toolbar", actions: [{ output: "typo", label: fixtureText.open, icon: "open" }] } }, Detail] });
// @ts-expect-error A collection cannot invent a selection output.
defineModule({ ...source, views: [{ ...Home, content: [{ kind: "collection", id: "items", input: "items", output: "typo" }] }, Detail] });
// @ts-expect-error A nested collection has the same output boundary as a root collection.
defineModule({ ...source, views: [{ ...Home, content: [{ kind: "stack", id: "items", title: fixtureText.items, items: [{ kind: "collection", id: "records", input: "items", output: "typo" }] }] }, Detail] });
// @ts-expect-error Exact output identity survives runtime View validation.
viewOutput(mounted, "typo");
// @ts-expect-error Private definitions cannot be read through the registered module.
Module.views;
// @ts-expect-error Non-exported aliases are not available in the public catalog.
Modules.views.Detail;

const root = { messages: FixtureMessages, id: "example", label: fixtureText.example, modules: Modules, exposures: [],
  workspace: WorkspaceView, views: [WorkspaceView, NavigationView], entry: Modules.destinations.home,
  navigation: [{ destination: Modules.destinations.home, group: fixtureText.explore, purpose: "content" }],
} as const;
composeProduct(root);
// @ts-expect-error Workspace roots use registered View references, not identifiers.
composeProduct({ messages: FixtureMessages, ...root, workspace: "workspace" });
// @ts-expect-error A destination cannot stand in for a workspace View.
composeProduct({ messages: FixtureMessages, ...root, workspace: Modules.destinations.home });
// @ts-expect-error Root entries are object references, not serialized IDs.
composeProduct({ messages: FixtureMessages, ...root, entry: "home" });
// @ts-expect-error Navigation cannot use serialized destination IDs.
composeProduct({ messages: FixtureMessages, ...root, navigation: [{ ...root.navigation[0], destination: "home" }] });
// @ts-expect-error A raw reference-shaped object is not an SDK-issued handle.
composeProduct({ messages: FixtureMessages, ...root, entry: { kind: "destination", owner: "example", id: "home" } });
// @ts-expect-error Root presentation links cannot point at a private raw module View.
composeProduct({ messages: FixtureMessages, ...root, journeys: [{ presentation: Inspect }] });
// @ts-expect-error Bindings preserve the exact public View's output vocabulary.
composeProduct({ messages: FixtureMessages, ...root, journeys: [{ presentation: { id: "root", kind: "presentation", view: Modules.views.Home, outputs: [{ view: Modules.views.Home, output: "close", action: { kind: "close" } }] } }] });
// @ts-expect-error A module's private View cannot be published by forging its handle shape.
composeProduct({ messages: FixtureMessages, ...root, journeys: [{ presentation: { ...Inspect, view: { kind: "view", owner: "example", id: "detail" } } }] });
// @ts-expect-error Root action links cannot use serialized journey IDs.
composeProduct({ messages: FixtureMessages, ...root, journeys: [{ presentation: { id: "root", kind: "presentation", view: Modules.views.Home, outputs: [{ view: Modules.views.Home, output: "open", action: { kind: "journey", journey: "browse" } }] } }] });
// @ts-expect-error Raw module arrays cannot substitute for an issued catalog.
composeProduct({ messages: FixtureMessages, ...root, modules: [Module] });
// @ts-expect-error A valid public handle still requires its module in this catalog.
composeProduct({ messages: FixtureMessages, ...root, modules: moduleIndex([]) });
void [sameId, sameOutput, stillLinked, publicViewId, publicJourneyId, publicOwner];
