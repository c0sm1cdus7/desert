import { clientDistribution, composeProduct, controllerDistribution, humanExposure, localBinding, remoteBinding } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { AgentNotebook, HumanNotebook } from "../products/notebook/exposures.ts";
import { ArchiveNote, CreateNote, ReadNote } from "../products/notebook/journeys.ts";
import { NotebookService } from "../products/notebook/distributions.ts";
import { NotesController } from "../products/notebook/dependencies.ts";
import { Dependencies } from "../products/notebook/src/modules.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";

const productIdentity: "notebook" = Notebook.id;
const controllerIdentity: "notes" = Notebook.dependencies![0]!.id;
void [productIdentity, controllerIdentity];

const client = { id: "terminal", product: Notebook, renderer: "terminal-cli" as const, bindings: [remoteBinding(Dependencies.notes, NotebookService)] };
const controller = { id: "controller", product: Notebook, runtime: "node" as const, storage: "postgresql" as const, provides: [] };
controllerDistribution({ ...controller, serves: [HumanNotebook, AgentNotebook] });
// @ts-expect-error Surface identities preserve the agent's own kind.
controllerDistribution({ ...controller, serves: [{ id: "agent", kind: "human" }] });
// @ts-expect-error Surface identities preserve the human's own kind.
controllerDistribution({ ...controller, serves: [{ id: "human", kind: "agent" }] });
clientDistribution({ ...client, surface: HumanNotebook });
// @ts-expect-error A human renderer cannot consume the agent protocol.
clientDistribution({ ...client, surface: AgentNotebook });
// @ts-expect-error Unsupported renderer.
clientDistribution({ ...client, surface: HumanNotebook, renderer: "imaginary" });
// @ts-expect-error An unregistered dependency cannot be bound.
clientDistribution({ ...client, surface: HumanNotebook, bindings: [{ dependency: "foreign", kind: "local", adapter: "store" }] });
// @ts-expect-error Unknown surface identity.
clientDistribution({ ...client, surface: { ...HumanNotebook, id: "unregistered" } });
// @ts-expect-error A well-shaped but unregistered controller is not a mounted dependency.
clientDistribution({ ...client, surface: HumanNotebook, bindings: [localBinding({ ...NotesController, id: "foreign" }, "store")] });
// @ts-expect-error A well-shaped but unregistered controller cannot be served either.
controllerDistribution({ ...controller, serves: [HumanNotebook], provides: [{ ...NotesController, id: "foreign" }] });

const rootOwnedSource = authoredNotebookSource();
const RootOwnedProduct = composeProduct(rootOwnedSource).definition;
controllerDistribution({ ...controller, product: RootOwnedProduct, serves: [HumanNotebook], provides: [...rootOwnedSource.dependencies] });
// @ts-expect-error Root-owned dependencies retain their identity just like module-owned dependencies.
controllerDistribution({ ...controller, product: RootOwnedProduct, serves: [HumanNotebook], provides: [{ ...NotesController, id: "foreign" }] });

const human = { id: "human", journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en" };
humanExposure(human);
// @ts-expect-error Entry belongs to the View program, never exposure.
humanExposure({ ...human, entry: CreateNote });
// @ts-expect-error Primary actions belong to View bindings, never exposure.
humanExposure({ ...human, primaryAction: ReadNote });
// @ts-expect-error Subject actions belong to object publication, never exposure.
humanExposure({ ...human, subjectActions: [ReadNote] });
// @ts-expect-error Journey labels come from the registered journey, never an exposure map.
humanExposure({ ...human, language: { locale: "en", journeys: { "create-note": "Create" } } });
// @ts-expect-error Human review comes from the registered mutation, never an exposure map.
humanExposure({ ...human, commit: { "create-note": "submit" } });
// @ts-expect-error Reads cannot acquire an execution policy through exposure.
humanExposure({ ...human, commit: { "read-note": "submit" } });
// @ts-expect-error Automatic execution cannot be introduced through exposure.
humanExposure({ ...human, commit: { "create-note": "automatic" } });

const projection = compile(Notebook).surface("human");
// @ts-expect-error Compiled metadata is immutable, including in TypeScript.
projection.id = "changed";
// @ts-expect-error Nested compiled metadata is immutable too.
projection.journeys.push(projection.journeys[0]!);
