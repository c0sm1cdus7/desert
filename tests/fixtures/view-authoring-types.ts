import { ViewVersion, type View, type MediaLibrary } from "../../src/index.ts";
import { factReference, initializeInput, publishObject, viewOutput, viewPorts, objectType, text as textField } from "../../src/index.ts";
import { Note } from "../../products/notebook/note.ts";
import { ArchiveNote, CreateNote } from "../../products/notebook/journeys.ts";

const header = { kind: "header", id: "identity", title: "Notes", subtitle: "Your writing." } as const;
const text = { kind: "text", text: "Introduction." } as const;
const stack = { kind: "stack", id: "recent", title: "Recent", items: [text] } as const;
const toolbar = { kind: "toolbar", actions: [{ output: "create", label: "New", icon: "create" }] } as const;
const detail = { version: ViewVersion, id: "detail", content: [] } as const satisfies View;
const base = { version: ViewVersion, id: "notes", outputs: ["create"],
  topDock: toolbar, content: [header, text, stack], rightDock: { kind: "view", view: detail },
} as const satisfies View;
const valid: View = base;
// @ts-expect-error Content is a sequence, not a forced stack envelope.
const forcedStack = { ...base, content: stack } satisfies View;
// @ts-expect-error Header is independent content, not a stack item.
const nestedHeader = { ...base, content: [{ ...stack, items: [header] }] } satisfies View;
// @ts-expect-error Every stack has a title.
const untitledStack = { ...base, content: [{ kind: "stack", id: "recent", items: [text] }] } satisfies View;
// @ts-expect-error The top dock only accepts a toolbar.
const wrongTop = { ...base, topDock: { kind: "view", view: "detail" } } satisfies View;
// @ts-expect-error Side docks accept a view reference, not toolbar content.
const wrongSide = { ...base, rightDock: toolbar } satisfies View;
// @ts-expect-error Product style input is not View vocabulary.
const styled = { ...base, style: "padding:0" } satisfies View;
// @ts-expect-error Nested catalog descriptors cannot accept a class override.
const styledChild = { ...base, content: [{ ...text, class: "large" }] } satisfies View;
// @ts-expect-error Actions emit outputs; views cannot select journeys.
const journeyAction = { ...base, topDock: { ...toolbar, actions: [{ ...toolbar.actions[0], journey: "create-note" }] } } satisfies View;
// @ts-expect-error Input bindings are not installed in this literal authoring slice.
const bound = { ...base, inputs: { note: "Note" } } satisfies View;
// @ts-expect-error Fields are not part of the passive catalog subset.
const field = { ...base, content: [{ kind: "input.text", name: "title", value: "" }] } satisfies View;
// @ts-expect-error A declared View is deeply readonly.
valid.content.push(text);
void [valid, forcedStack, nestedHeader, untitledStack, wrongTop, wrongSide, styled, styledChild, journeyAction, bound, field];

const library = { id: "photos", items: [{ id: "photo", kind: "image", title: "Coast", image: { asset: "coast", alt: "A coast" } }],
  albums: [{ id: "travel", title: "Travel", cover: "photo", items: ["photo"] }], featured: ["travel"],
} as const satisfies MediaLibrary;
const media = { kind: "media-library", id: "library", library } as const;
const mediaView = { version: ViewVersion, id: "media", content: [header, media] } as const satisfies View;
// @ts-expect-error A media library is a root composition, never an inner stack leaf.
const stackedMedia = { ...mediaView, content: [{ ...stack, items: [media] }] } satisfies View;
// @ts-expect-error Album definitions require an explicit cover reference.
const uncoveredAlbum = { ...library, albums: [{ id: "travel", title: "Travel", items: ["photo"] }] } satisfies MediaLibrary;
// @ts-expect-error Library assets use logical references rather than a URL-shaped resource.
const remoteImage = { ...library, items: [{ id: "photo", kind: "image", title: "Coast", image: { url: "https://example.com/photo.jpg", alt: "A coast" } }] } satisfies MediaLibrary;
// @ts-expect-error The shared composition owns its geometry.
const styledMedia = { ...mediaView, content: [{ ...media, style: "padding:0" }] } satisfies View;
const frozenLibrary: MediaLibrary = library;
// @ts-expect-error A mounted library cannot be changed by its consumer.
frozenLibrary.featured.push("travel");
void [mediaView, stackedMedia, uncoveredAlbum, remoteImage, styledMedia];

const ports = viewPorts({ inputs: { notes: "collection" }, outputs: ["create", "select"] });
const formPorts = viewPorts({ inputs: { draft: "form" }, outputs: ["save"] });
const exactFormKind: "form" = formPorts.inputs.draft.kind;
const exactOutputTuple: readonly ["save"] = formPorts.outputs;
// @ts-expect-error Port kinds derive only from the installed View binding schema.
viewPorts({ inputs: { image: "image" }, outputs: [] });
const linkedView = { ...base, outputs: ports.outputs, content: [header,
  { ...ports.inputs.notes, id: "records", output: ports.output.select }],
} as const satisfies View;
const linkedOutput = viewOutput(linkedView, "create");
const linkedTitle = factReference(Note, "title");
const initializer = initializeInput(CreateNote.command, "title", linkedTitle);
const published = publishObject(Note, { view: base, title: linkedTitle, actions: [{ journey: ArchiveNote, icon: "archive" }] });
const exactPublishedIcon: "archive" = published.presentation.actions[0].icon;
const exactPublishedJourney: typeof ArchiveNote = published.presentation.actions[0].journey;
const Other = objectType({ id: "other", facts: { title: textField() } });
// @ts-expect-error Output properties are derived only from the declared names.
ports.output.missing;
// @ts-expect-error Input properties are derived only from the declared names.
ports.inputs.missing;
// @ts-expect-error View references cannot invent outputs.
viewOutput(linkedView, "missing");
// @ts-expect-error Fact references select a fact belonging to this object definition.
factReference(Note, "missing");
// @ts-expect-error Initializers cannot invent command inputs.
initializeInput(CreateNote.command, "missing", linkedTitle);
// @ts-expect-error An initializer cannot cross object identities.
initializeInput(CreateNote.command, "title", factReference(Other, "title"));
// @ts-expect-error Object titles cannot reference a different object.
publishObject(Note, { view: base, title: factReference(Other, "title"), actions: [] });
// @ts-expect-error A principal is not a presentable object title.
publishObject(Note, { view: base, title: factReference(Note, "owner"), actions: [] });
// @ts-expect-error Only subject mutations, not creation, are published by an existing object.
publishObject(Note, { view: base, title: linkedTitle, actions: [{ journey: CreateNote, icon: "create" }] });
// @ts-expect-error Published actions always declare their semantic icon.
publishObject(Note, { view: base, title: linkedTitle, actions: [{ journey: ArchiveNote }] });
// @ts-expect-error There is only one explicit action registry, not a bare journey list.
publishObject(Note, { view: base, title: linkedTitle, journeys: [ArchiveNote] });
const subjectTitleView = { ...base, content: [{ ...header, title: { kind: "subject-title" } }] } as const satisfies View;
const operationTitleView = { ...base, content: [{ ...header, title: { kind: "operation-label" } }] } as const satisfies View;
// @ts-expect-error No arbitrary expression language can be used for a title.
const expressionTitleView = { ...base, content: [{ ...header, title: { kind: "expression", value: "note.title" } }] } satisfies View;
// @ts-expect-error A semantic title cannot select an unauthorized field or redefine its styling.
const overriddenTitleView = { ...base, content: [{ ...header, title: { kind: "subject-title", field: "owner" } }] } satisfies View;
// @ts-expect-error Views cannot execute a callback to compute their title.
const callbackTitleView = { ...base, content: [{ ...header, title: () => "computed" }] } satisfies View;
void [linkedView, linkedOutput, initializer, published];
void [exactFormKind, exactOutputTuple, exactPublishedIcon, exactPublishedJourney];
void [subjectTitleView, operationTitleView, expressionTitleView, overriddenTitleView, callbackTitleView];
