import { labels, text, objectType, createCommand, fromInput, literal, updateCommand,
  readJourney, controllerRole, Components, defineView, viewPorts, publishObject, factReference, type InputOf } from "../../src/index.ts";
import { fixtureText } from "./messages.ts";

const Item = objectType({ id: "labeled-item", facts: { title: text(), projects: labels() } });
const Controller = controllerRole({ id: "items", objects: [Item], requires: [] });
const requires = { controller: Controller, dependencies: [] };
const Create = createCommand("create", Item, { input: ["title", "projects"], values: { title: fromInput("title"), projects: fromInput("projects") } });
const valid: InputOf<typeof Item, typeof Create> = { title: "Task", projects: ["Desert"] };
const empty: InputOf<typeof Item, typeof Create> = { title: "Task", projects: [] };
void [valid, empty];
// @ts-expect-error Labels are arrays, never JSON or comma-separated string values.
const scalar: InputOf<typeof Item, typeof Create> = { title: "Task", projects: "Desert,Void" };
// @ts-expect-error Missing values never imply an empty set on the authority.
const missing: InputOf<typeof Item, typeof Create> = { title: "Task" };
// @ts-expect-error Labels do not customize color or renderer layout.
labels({ color: "red" });
// @ts-expect-error Scalar input cannot assign a labels fact.
createCommand("wrong-input", Item, { input: ["title"], values: { title: fromInput("title"), projects: fromInput("title") } });
// @ts-expect-error Literal array/string defaults are not authored label capabilities.
createCommand("literal", Item, { input: ["title"], values: { title: fromInput("title"), projects: literal("Desert") } });
// @ts-expect-error Labels cannot be scalar conditions.
updateCommand("condition", Item, { input: [], when: { projects: ["Desert"] }, set: { title: literal("New") } });
// Collection exposure may include relationship data; a plain text view cannot render it.
readJourney("collection", Item, { fields: ["title", "projects"], collection: ["projects"], requires });
const ports = viewPorts({ inputs: { subject: "context" }, outputs: [] });
const view = defineView({ name: "item", content: [Components.Context({ input: ports.inputs.subject })] });
publishObject(Item, { view, title: factReference(Item, "title"), actions: [], fields: [
  { fact: factReference(Item, "projects"), label: fixtureText.projects, representation: "tags" },
] });
// @ts-expect-error A title must be scalar, never labels.
publishObject(Item, { view, title: factReference(Item, "projects"), actions: [] });
// @ts-expect-error Labels always publish tags, never paragraphs or text.
publishObject(Item, { view, title: factReference(Item, "title"), actions: [], fields: [{ fact: factReference(Item, "projects"), label: fixtureText.projects, representation: "text" }] });
