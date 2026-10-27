import { objectType, file, text, principal, createCommand, fromInput, literal, actorId,
  readJourney, controllerRole, updateCommand, Components, defineView, viewPorts, publishObject, factReference } from "../../src/index.ts";
import { fixtureText } from "./messages.ts";

const Photo = objectType({ id: "photo", facts: { image: file({ accept: ["image/jpeg", "image/png", "image/webp"], maxBytes: 20_971_520 }), title: text(), owner: principal() } });
const Controller = controllerRole({ id: "images", objects: [Photo], requires: [] });
const requires = { controller: Controller, dependencies: [] };
createCommand("import", Photo, { input: ["image", "title"], values: { image: fromInput("image"), title: fromInput("title"), owner: actorId() } });
readJourney("read", Photo, { fields: ["image", "title"], collection: ["title"], requires });
// @ts-expect-error No URL, path, preview or renderer customization on a file definition; only accepted types and a size limit.
file({ accept: ["image/jpeg"], maxBytes: 1, url: "https://example.com/photo.jpg" });
// @ts-expect-error A file accepts only the media types of the SDK policy.
file({ accept: ["text/html"], maxBytes: 1 });
// @ts-expect-error Private assets cannot be literals; only a typed asset input may assign them.
createCommand("literal", Photo, { input: ["title"], values: { image: literal("path"), title: fromInput("title"), owner: actorId() } });
// @ts-expect-error A scalar input is not compatible with a private asset.
createCommand("scalar", Photo, { input: ["title"], values: { image: fromInput("title"), title: fromInput("title"), owner: actorId() } });
// @ts-expect-error Identity is not a private image asset.
createCommand("actor", Photo, { input: ["title"], values: { image: actorId(), title: fromInput("title"), owner: actorId() } });
// Read exposure can include assets; the view compiler requires a finite media presentation, never text coercion.
readJourney("media-collection", Photo, { fields: ["image", "title"], collection: ["image"], requires });
// @ts-expect-error Conditions cannot compare private asset references.
updateCommand("invalid-condition", Photo, { input: [], when: { image: "path" }, set: { title: literal("New title") } });
const ports = viewPorts({ inputs: { subject: "context" }, outputs: [] });
const view = defineView({ name: "photo", content: [Components.Context({ input: ports.inputs.subject })] });
publishObject(Photo, { view, title: factReference(Photo, "title"), actions: [], fields: [
  { fact: factReference(Photo, "title"), label: fixtureText.title, representation: "text" },
  { fact: factReference(Photo, "image"), label: fixtureText.image, representation: "image" },
] });
// @ts-expect-error An object title must be scalar, never an asset reference.
publishObject(Photo, { view, title: factReference(Photo, "image"), actions: [] });
// @ts-expect-error Assets have image representation, never paragraphs/text.
publishObject(Photo, { view, title: factReference(Photo, "title"), actions: [], fields: [{ fact: factReference(Photo, "image"), label: fixtureText.image, representation: "text" }] });
