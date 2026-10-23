import { objectType, text, imageAsset, principal, createCommand, fromInput, actorId, controllerRole, ownershipPolicy, mutationJourney, readJourney,
  humanExposure, composeProduct, moduleIndex, publishObject, factReference, Components, ViewTitles, defineView, viewPorts, viewOutput,
} from "../../src/index.ts";
import { compile } from "../../src/compile.ts";
import type { HumanSurface, Mutation } from "../../src/web/types.ts";
import { readScopes } from "../../src/web/client/view-scopes.ts";
import { WorkspaceView, NavigationView } from "./workspace-view.ts";

export const Photo = objectType({ id: "photo", facts: { title: text({ minLength: 1 }), image: imageAsset(), owner: principal() } });
const Controller = controllerRole({ id: "photos", objects: [Photo], requires: [] });
const requires = { controller: Controller, dependencies: [] };
export const ImportPhoto = mutationJourney("import-photo", createCommand("import-photo-record", Photo, {
  input: ["title", "image"], values: { title: fromInput("title"), image: fromInput("image"), owner: actorId() },
}), requires);
export const ReadPhotos = readJourney("read-photos", Photo, { fields: ["title", "image"], collection: ["title"], requires });
const listPorts = viewPorts({ inputs: { records: "collection" }, outputs: ["select", "import"] });
const detailPorts = viewPorts({ inputs: { photo: "context" }, outputs: ["close"] });
const editorPorts = viewPorts({ inputs: { draft: "form" }, outputs: ["save", "close"] });
const ListView = defineView({ name: "images", outputs: listPorts.outputs,
  topDock: Components.Toolbar({ actions: [{ output: listPorts.output.import, label: "Import image", icon: "create" }] }),
  content: [Components.Header({ title: "My images" }), Components.Collection({ input: listPorts.inputs.records, output: listPorts.output.select })] });
const PhotoView = defineView({ name: "photo", outputs: detailPorts.outputs,
  topDock: Components.Toolbar({ actions: [{ output: detailPorts.output.close, label: "Close", icon: "close" }] }),
  content: [Components.Header({ title: ViewTitles.subject }), Components.Context({ input: detailPorts.inputs.photo })] });
const ImportView = defineView({ name: "import-image", outputs: editorPorts.outputs,
  topDock: Components.Toolbar({ actions: [{ output: editorPorts.output.close, label: "Close", icon: "close" }] }),
  bottomDock: Components.Toolbar({ actions: [{ output: editorPorts.output.save, label: "Import image", icon: "save" }] }),
  content: [Components.Header({ title: ViewTitles.operation }), Components.Form({ input: editorPorts.inputs.draft })] });
const Home = { id: "images", label: "My images", icon: "media", entryJourney: ReadPhotos } as const;
export const ImagesProduct = composeProduct({ id: "image-input", label: "Images", modules: moduleIndex([]),
  objects: [publishObject(Photo, { view: PhotoView, title: factReference(Photo, "title"),
    fields: [{ fact: factReference(Photo, "title"), label: "Title", representation: "text" },
      { fact: factReference(Photo, "image"), label: "Image", representation: "image" }], actions: [] })],
  dependencies: [Controller], policies: [ownershipPolicy(Photo, "owner")], journeys: [
    { execution: ImportPhoto, label: "Import image", humanReview: "not-required", presentation: {
      id: ImportPhoto.id, kind: "create", source: ReadPhotos, view: ImportView, preferredDock: "right", outputs: [
        { ...viewOutput(ImportView, "save"), action: { kind: "submit" } }, { ...viewOutput(ImportView, "close"), action: { kind: "close" } },
      ] } },
    { execution: ReadPhotos, label: "My images", presentation: { id: ReadPhotos.id, kind: "read", view: ListView, detailView: PhotoView, outputs: [
      { ...viewOutput(ListView, "select"), action: { kind: "select" } },
      { ...viewOutput(ListView, "import"), action: { kind: "journey", journey: ImportPhoto } },
      { ...viewOutput(PhotoView, "close"), action: { kind: "close" } },
    ] } },
  ],
  views: [ListView, PhotoView, ImportView, WorkspaceView, NavigationView], workspace: WorkspaceView,
  destinations: [Home], entry: Home, navigation: [{ destination: Home, group: "Explore", purpose: "content" }],
  exposures: [humanExposure({ id: "human", journeys: [ImportPhoto, ReadPhotos], locale: "en" })],
});
export const Images = ImagesProduct.definition;
export const program = ImagesProduct.viewProgram;
export const application = compile(Images);
export const surface = application.surface("human") as HumanSurface;
export const scope = readScopes(program, surface).find(scope => scope.read.id === ReadPhotos.id)!;
export const mutation = surface.journeys.find(item => item.id === ImportPhoto.id) as Mutation;
export const validate = Object.assign((id: string, input: unknown) => application.validateInput(id, input).valid,
  { inspect: (id: string, input: unknown) => application.validateInput(id, input) });
export const ready = { snapshot: { contractDigest: surface.contractDigest,
  journeys: Object.fromEntries(surface.journeys.map(item => [item.id, { dependenciesReady: true, blockers: [] }])) }, validForMs: 1000 };
