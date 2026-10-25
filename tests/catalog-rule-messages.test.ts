// Rule V (plan §14): a catalog template writes no human text; a sentence is a key of the SDK message catalog. Every
// non-whitespace text node and every literal aria-label, title, placeholder or alt under the catalog is LITERAL_TEXT, and
// so is a literal purpose sentence in a declaration and a literal sentence in a module that owns a message namespace.
import assert from "node:assert/strict";
import test from "node:test";
import { ruleV } from "../src/authoring/catalog/gate/messages.ts";
import { codes, composition, contextOf, foundation } from "./support/catalog-context.ts";
import { testLayout } from "./support/catalog-layout.ts";

const field = "src/svelte/catalog/foundations/field/Field.svelte", page = "src/svelte/catalog/compositions/page/Page.svelte";
const run = (files: Record<string, string>) => codes(ruleV(contextOf(files)));

test("V control: messages, expressions, whitespace, scripts and styles carry no literal text", () => {
  const markup = `<script lang="ts">\n  const label = "not template text";\n</script>\n\n<div aria-label={m.field.clear} title={label}>\n  {m.field.clear}\n  {value}\n</div>\n<img alt={m.field.clear} src="/x.svg" />\n<input placeholder={hint} class="well" />\n<style>.well { content: "x"; }</style>\n`;
  assert.deepEqual(run(foundation("field", "Field.svelte", markup)), []);
});

test("V: a text node in a foundation and in a composition is LITERAL_TEXT, with the text it writes", () => {
  const files = { ...foundation("field", "Field.svelte", "<p>Clear</p>\n"), ...composition("page", "Page.svelte", [], "{#if x}<span> Unlock </span>{/if}\n") };
  assert.deepEqual(run(files), [
    `LITERAL_TEXT ${page} the text "Unlock" is written in the template; use a message key (m.<owner>.<meaning>)`,
    `LITERAL_TEXT ${field} the text "Clear" is written in the template; use a message key (m.<owner>.<meaning>)`,
  ]);
});

test("V: a literal aria-label, title, placeholder or alt is LITERAL_TEXT, partly literal ones included", () => {
  const markup = '<button aria-label="Close"></button>\n<abbr title="Note"></abbr>\n<input placeholder="Search" />\n<img alt="Avatar" />\n<span aria-label="Clear {label}"></span>\n<span title={"Literal"}></span>\n';
  const what = (attribute: string, value: string) =>
    `LITERAL_TEXT ${field} ${attribute}="${value}" is written in the template; use a message key (m.<owner>.<meaning>)`;
  assert.deepEqual(run(foundation("field", "Field.svelte", markup)), [
    what("aria-label", "Close"), what("title", "Note"), what("placeholder", "Search"), what("alt", "Avatar"),
    what("aria-label", "Clear "), what("title", "Literal")]);
});

test("V: a string literal written as an expression tag is literal text too", () => {
  assert.deepEqual(run(foundation("field", "Field.svelte", '<p>{"Clear"}</p>\n')),
    [`LITERAL_TEXT ${field} the text "Clear" is written in the template; use a message key (m.<owner>.<meaning>)`]);
});

test("V judges the catalog only: the build template and the vendor families are other rules' business", () => {
  const files = { "src/build/svelte/template/src/routes/+page.svelte": "<p>Loading</p>\n",
    "src/svelte/vendor/components/ui/button/button.svelte": "<span>Vendor</span>\n" };
  assert.deepEqual(run(files), []);
});

const media = "src/svelte/catalog/foundations/media/Media.svelte";
const imageContract = `import { Type } from "@sinclair/typebox";
export const C = { props: Type.Union([
  Type.Object({ alt: Type.String(), placeholder: Type.Optional(Type.Undefined()) }, { additionalProperties: false }),
  Type.Object({ placeholder: Type.Union([Type.Literal("video"), Type.Literal("unavailable")]) }, { additionalProperties: false }),
]) } as const;\n`;
const withImage = (markup: string) => ({ ...foundation("image", "Image.svelte", "<img alt={m.image.alt} />\n"),
  "src/svelte/catalog/foundations/image/image.contract.ts": imageContract,
  ...foundation("media", "Media.svelte", `<script lang="ts">\n  import Image from "../image/Image.svelte";\n</script>\n${markup}`) });

test("V: a literal on a piece prop whose contract offers only literal values is vocabulary, not text", () => {
  assert.deepEqual(run(withImage('<Image placeholder="unavailable" />\n<Image placeholder="video" />\n')), []);
});

test("V: a piece's text prop, a literal its vocabulary does not offer, and an unresolved tag stay LITERAL_TEXT", () => {
  const what = (attribute: string, value: string) =>
    `LITERAL_TEXT ${media} ${attribute}="${value}" is written in the template; use a message key (m.<owner>.<meaning>)`;
  assert.deepEqual(run(withImage('<Image alt="Photo" />\n<Image placeholder="Loading" />\n<Unknown placeholder="video" />\n')), [
    what("alt", "Photo"), what("placeholder", "Loading"), what("placeholder", "video")]);
});

// The law reaches beyond templates: a piece's purpose is a key of its own namespace, and a module that owns a namespace
// of the catalog (layout.messages.namespaces: the access client, the field feedback, the frame…) says every sentence it
// shows a person through its keys. A sentence is two words or one capitalized word; codes, keys and vocabulary are not.
const feedback = "src/web/client/field-feedback.ts";
const withNamespace = (files: Record<string, string>) => {
  const layout = testLayout();
  return codes(ruleV(contextOf(files, { ...layout, messages: { ...layout.messages, namespaces: { fieldFeedback: feedback } } })));
};
const declared = (purpose: string) => ({ "src/svelte/catalog/foundations/note/note.catalog.ts": `import { defineFoundation } from "x";
export const F = defineFoundation({ id: "note", purpose: ${purpose}, messages: ["note.purpose"], owner: { entry: "Note.svelte" },
  shape: "radius", states: ["default"], variants: { purpose: ["commands", "commit"] }, approval: "required", contract: C } as const);\n` });
const purposeAdvice = (text: string) => `LITERAL_TEXT src/svelte/catalog/foundations/note/note.catalog.ts the purpose "${text}" is written in the declaration; ` +
  "declare it as the key of its owner (purpose: { key: \"<owner>.purpose\" })";
const moduleAdvice = (text: string) => `LITERAL_TEXT ${feedback} the text "${text}" is written in the module; use a key of the namespace it owns (m.<namespace>.<meaning>)`;

test("V: a literal purpose sentence is LITERAL_TEXT; a purpose key and a purpose variant axis are not", () => {
  assert.deepEqual(run(declared('"Show one note at a time."')), [purposeAdvice("Show one note at a time.")]);
  assert.deepEqual(run(declared('{ key: "note.purpose" }')), []);
});

test("V: a namespace module that writes a sentence, a template sentence or a capitalized label is LITERAL_TEXT", () => {
  const module = `import { m } from "../../messages/keys.ts";
export function feedback(limit: number, kind: string) {
  if (kind === "required") return "Enter a value.";
  if (kind === "min") return \`Enter at least \${limit} characters.\`;
  return kind === "back" ? "Back" : "Loading…";
}\n`;
  assert.deepEqual(withNamespace({ [feedback]: module }), [moduleAdvice("Enter a value."), moduleAdvice("Enter at least "),
    moduleAdvice("Back"), moduleAdvice("Loading…")]);
});

test("V on the real tree: the gate reads every namespace module; none writes a sentence, and one that did would fail", async () => {
  const { realContext, realSource } = await import("./support/real-tree.ts");
  const { DesertLayout } = await import("../src/authoring/catalog/layout.ts");
  const modules = [...new Set(Object.values(DesertLayout.messages.namespaces))];
  const context = realContext();
  for (const path of modules) assert.notEqual(context.text(path), undefined, `${path} is read by the gate`);
  const inModules = (found: readonly { path: string }[]) => found.filter(item => modules.includes(item.path));
  assert.deepEqual(codes(inModules(ruleV(context))), []);
  const frame = "src/web/client/frame.ts", mutated = realSource(frame).replace("bundle.text(m.frame.loading)", '"Loading…"');
  assert.notEqual(mutated, realSource(frame));
  assert.deepEqual(codes(inModules(ruleV(realContext({ [frame]: mutated })))),
    [`LITERAL_TEXT ${frame} the text "Loading…" is written in the module; use a key of the namespace it owns (m.<namespace>.<meaning>)`]);
});

test("V control: a namespace module saying its keys, codes, vocabulary and module paths, and a module that owns no namespace, pass", () => {
  const module = `import { rendererLocale } from "../../messages/renderer-locale.ts";
import { Messages, m } from "../../messages/keys.ts";
const bundle = Messages.bundle(rendererLocale);
export type State = "loading" | "ready" | "offline";
export function feedback(kind: string, limit: number): string {
  if (kind === "reference.create") throw new Error("INVALID_REFERENCE_CAPABILITY");
  const format = new Intl.DateTimeFormat("en", { weekday: "long" });
  return kind === "required" ? bundle.text(m.fieldFeedback.required) : bundle.text(m.fieldFeedback.atLeast, { limit: String(limit) }) + format.format(0) + \`\${kind}.items\`;
}\n`;
  assert.deepEqual(withNamespace({ [feedback]: module, "src/web/client/transport.ts": 'export const header = "Content type of the request";\n' }), []);
});
