import { enumeration, integer, objectType, principal, text } from "../src/contracts.ts";
import { actorId, createCommand, fromInput, literal, updateCommand } from "../src/commands.ts";
import { mutationJourney, ownershipPolicy, readJourney } from "../src/journeys.ts";
import type { FactsOf, InputOf } from "../src/authoring-types.ts";
import { controllerRole } from "../src/dependencies.ts";
import type { RendererBank, InputPrimitive } from "../src/interaction/catalog.ts";
import type { SurfaceFrame } from "../src/interaction/surface-frame.ts";
import type { ToolbarAction } from "../src/interaction/toolbar.ts";
import type { SurfaceIntent } from "../src/interaction/intent.ts";

// @ts-expect-error Every button requires an installed semantic icon.
const missingActionIcon: ToolbarAction = { intent: { kind: "journey", journey: "save" }, label: "Save", state: "ready" };
// @ts-expect-error Arbitrary icon strings are not an installed bank vocabulary.
const inventedActionIcon: ToolbarAction = { intent: { kind: "journey", journey: "save" }, label: "Save", state: "ready", icon: "rainbow" };
void [missingActionIcon, inventedActionIcon];
const journeyNamedAccept: SurfaceIntent = { kind: "journey", journey: "accept" };
const acceptIntent: SurfaceIntent = { kind: "accept" };
// @ts-expect-error Renderer operations cannot be encoded as ambiguous strings.
const ambiguousIntent: SurfaceIntent = "accept";
// @ts-expect-error Journey references are mandatory for journey intents.
const missingJourney: SurfaceIntent = { kind: "journey" };
// @ts-expect-error Surface operations cannot carry a product journey reference.
const mixedIntent: SurfaceIntent = { kind: "accept", journey: "accept" };
// @ts-expect-error Free action ids no longer substitute for typed intent.
const untypedAction: ToolbarAction = { id: "accept", label: "Save", state: "ready", icon: "save" };
void [journeyNamedAccept, acceptIntent, ambiguousIntent, missingJourney, mixedIntent, untypedAction];

const contextFrame: SurfaceFrame = { version: "desert.surface-frame/6", kind: "context",
  top: { title: "Note" }, content: { kind: "message", text: "Loading…" }, bottom: {} };
// @ts-expect-error The top slot is mandatory, not an optional snippet.
const noTop: SurfaceFrame = { version: "desert.surface-frame/6", kind: "context", content: contextFrame.content, bottom: contextFrame.bottom };
// @ts-expect-error Raw markup is not a bank primitive.
const rawContent: SurfaceFrame = { ...contextFrame, content: { kind: "html", html: "<p/>" } };
// @ts-expect-error A composition cannot override renderer geometry.
const customGeometry: SurfaceFrame = { ...contextFrame, class: "p-0" };
void [noTop, rawContent, customGeometry];
// @ts-expect-error Local selection controls cannot carry task-frame chrome.
const selectionFrame: SurfaceFrame = { ...contextFrame, kind: "selection" };
void selectionFrame;
// @ts-expect-error Identity belongs to the typed header, never message content.
const bodyFace: SurfaceFrame = { ...contextFrame, content: { kind: "message", text: "Preserved", face: { kind: "status", severity: "warning" } } };
// @ts-expect-error Face styling cannot be supplied by a consumer.
const styledFace: SurfaceFrame = { ...contextFrame, top: { title: "Warning", face: { kind: "status", severity: "warning", class: "red" } } };
void [bodyFace, styledFace];
// @ts-expect-error Object contexts cannot become mutation forms.
const contextForm: SurfaceFrame = { ...contextFrame, content: { kind: "form", submit: "save", fields: [] } };
// @ts-expect-error Object context footers cannot contain a primary command.
const contextCommand: SurfaceFrame = { ...contextFrame, bottom: { primary: { intent: { kind: "journey", journey: "save" }, label: "Save", icon: "save", state: "ready" } } };
void [contextForm, contextCommand];
import { humanSurface } from "../src/surfaces.ts";
import { factReference, publishObject } from "../src/index.ts";
import { Note as PublishedNote } from "./fixtures/notebook-domain.ts";
import { notePublication } from "./fixtures/authored-notebook.ts";
import { HumanNotebook } from "../products/notebook/surfaces.ts";
import { CreateNote, ReadNote, ArchiveNote } from "../products/notebook/journeys.ts";

const multiline: InputPrimitive = "input.multiline";
void multiline;
// @ts-expect-error Products cannot invent a renderer primitive.
const unknownPrimitive: InputPrimitive = "input.rainbow";
// @ts-expect-error A renderer must implement the complete installed bank.
const incompleteBank: RendererBank<string> = { "input.text": "TextInput" };
declare const completeBank: RendererBank<string>;
// @ts-expect-error A renderer cannot extend the vocabulary independently.
const inventedBank: RendererBank<string> = { ...completeBank, rainbow: "Rainbow" };
void [unknownPrimitive, incompleteBank, inventedBank];
const human = { id: HumanNotebook.id, journeys: [CreateNote, ReadNote, ArchiveNote], locale: "en" };
humanSurface(human);
// @ts-expect-error A product cannot present an unknown fact.
publishObject(PublishedNote, { ...notePublication, fields: [{ fact: factReference(PublishedNote, "imagined"), label: "Imagined", representation: "text" }] });
// @ts-expect-error A renderer primitive is not a semantic field representation.
publishObject(PublishedNote, { ...notePublication, fields: [{ fact: factReference(PublishedNote, "body"), label: "Content", representation: "input.multiline" }] });
// @ts-expect-error Composed exposure cannot redefine an object's field representation.
humanSurface({ ...human, inputs: { "note.body": "input.multiline" } });
// @ts-expect-error Composed exposure cannot override a published representation.
humanSurface({ ...human, fieldRepresentations: { "note.body": "paragraphs" } });
// @ts-expect-error Product contracts cannot supply renderer CSS.
humanSurface({ ...human, class: "custom-layout" });

const Note = objectType({ id: "typed-note", facts: {
  title: text({ minLength: 1 }), copies: integer(), owner: principal(), state: enumeration(["active", "archived"]),
} });
const valid = { title: "Idea", copies: 1, owner: "alice", state: "active" } satisfies FactsOf<typeof Note>;
void valid;
// @ts-expect-error A number is not a text fact.
const badTitle: FactsOf<typeof Note> = { ...valid, title: 42 };
// @ts-expect-error The enum retains its exact members.
const badState: FactsOf<typeof Note> = { ...valid, state: "published" };
void [badTitle, badState];

const values = { title: fromInput("title"), copies: literal(1), owner: actorId(), state: literal("active") };
const Create = createCommand("create", Note, { input: ["title"], values });
const requires = { controller: controllerRole({ id: "notes", objects: [Note], requires: [] }), dependencies: [] };
mutationJourney("create-journey", Create, requires);
ownershipPolicy(Note, "owner");
readJourney("read", Note, { fields: ["title"], collection: ["state"], requires });
updateCommand("archive", Note, { input: [], when: { state: "active" }, set: { state: literal("archived") } });

// @ts-expect-error Missing object field.
readJourney("read", Note, { fields: ["missing"], collection: ["title"], requires });
// @ts-expect-error A title is not an ownership principal.
ownershipPolicy(Note, "title");
// @ts-expect-error Missing command input field.
createCommand("create", Note, { input: ["missing"], values });
// @ts-expect-error Owners are not author-supplied input.
createCommand("create", Note, { input: ["owner"], values });
// @ts-expect-error A text expression cannot feed an integer fact.
createCommand("create", Note, { input: ["title"], values: { ...values, copies: fromInput("title") } });
// @ts-expect-error Unknown enum value.
createCommand("create", Note, { input: ["title"], values: { ...values, state: literal("published") } });
// @ts-expect-error Not in this command's input.
createCommand("create", Note, { input: [], values });
// @ts-expect-error A literal does not establish an authenticated principal.
createCommand("create", Note, { input: ["title"], values: { ...values, owner: literal("alice") } });
// @ts-expect-error The create effect must provide every required fact.
createCommand("create", Note, { input: ["title"], values: { title: fromInput("title") } });
// @ts-expect-error Ownership reassignment is not supported.
updateCommand("archive", Note, { input: [], when: { state: "active" }, set: { owner: actorId() } });
// @ts-expect-error The condition retains the object's enum.
updateCommand("archive", Note, { input: [], when: { state: "published" }, set: { state: literal("archived") } });
// @ts-expect-error Queries cannot masquerade as mutation commands.
mutationJourney("invalid", readJourney("read", Note, { fields: ["title"], collection: ["title"], requires }), requires);

const input: InputOf<typeof Note, typeof Create> = { title: "Idea" };
void input;
// @ts-expect-error Required input is derived, not redeclared.
const missingInput: InputOf<typeof Note, typeof Create> = {};
// @ts-expect-error Owner is not a command input.
const injectedOwner: InputOf<typeof Note, typeof Create> = { title: "Idea", owner: "alice" };
// @ts-expect-error Input types come from the object definition.
const numericTitle: InputOf<typeof Note, typeof Create> = { title: 42 };
void [missingInput, injectedOwner, numericTitle];
