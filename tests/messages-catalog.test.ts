// Plan §14: a sentence lives in one bundle; keys.ts is generated from the bundles; the m accessor yields closed messages;
// a key the selected locale lacks is MESSAGE_MISSING; a malformed bundle is MESSAGE_CATALOG.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { Value } from "@sinclair/typebox/value";
import { messageCatalog, requireMessageCatalog } from "../src/messages/catalog.ts";
import { bundleLocale, generateMessageKeys } from "../src/messages/generate.ts";
import { message } from "../src/views/definition.ts";
import { Messages, MessageKeySchema, m } from "../src/messages/keys.ts";
import { surfaceErrorCodes } from "../src/messages/error-codes.ts";

const notes = messageCatalog({ en: { notes: { title: "Notes", clear: "Clear {label}" } } } as const);

test("the accessor yields the closed message of each key, frozen, and the key schema admits exactly the keys", () => {
  assert.deepEqual(notes.m.notes.title, { key: "notes.title" });
  assert.ok(Object.isFrozen(notes.m.notes.title) && Object.isFrozen(notes.m.notes) && Object.isFrozen(notes.m));
  assert.equal(Value.Check(message, notes.m.notes.title), true);
  assert.deepEqual(notes.keys, ["notes.clear", "notes.title"]);
  assert.equal(Value.Check(notes.keySchema, "notes.title"), true);
  assert.equal(Value.Check(notes.keySchema, "notes.subtitle"), false);
});

test("a bundle resolves a message in its locale and fills every named parameter", () => {
  const en = notes.bundle("en");
  assert.equal(en.text(notes.m.notes.title), "Notes");
  assert.equal(en.text(notes.m.notes.clear, { label: "Title" }), "Clear Title");
});

test("MESSAGE_MISSING: a key the locale lacks, and a locale the catalog lacks", () => {
  assert.throws(() => notes.bundle("en").text({ key: "notes.subtitle" }), /^Error: MESSAGE_MISSING: notes\.subtitle is not in the en bundle$/);
  assert.throws(() => notes.bundle("es"), /^Error: MESSAGE_MISSING: no es bundle; the catalog has en$/);
});

test("MESSAGE_PARAMETERS: a sentence's parameters are given exactly", () => {
  assert.throws(() => notes.bundle("en").text(notes.m.notes.clear), /MESSAGE_PARAMETERS: notes\.clear in en takes \{label\}; given none/);
  assert.throws(() => notes.bundle("en").text(notes.m.notes.title, { label: "x" }), /MESSAGE_PARAMETERS/);
});

test("MESSAGE_CATALOG: a key without a meaning segment, an empty sentence, a bad segment, a bad locale", () => {
  assert.throws(() => messageCatalog({ en: { title: "Notes" } }), /MESSAGE_CATALOG: en: title needs an owner segment and a meaning segment/);
  assert.throws(() => messageCatalog({ en: { notes: { title: " " } } }), /MESSAGE_CATALOG: en: notes\.title is an empty sentence/);
  assert.throws(() => messageCatalog({ en: { notes: { "two words": "x" } } }), /MESSAGE_CATALOG: en: notes\.two words is not a message segment/);
  assert.throws(() => messageCatalog({ english: { notes: { title: "x" } } }), /MESSAGE_CATALOG: english is not a locale/);
  assert.throws(() => messageCatalog({ en: { notes: { title: "x" } }, es: { notes: { title: { short: "y" } } } }),
    /MESSAGE_CATALOG: notes\.title(\.short)? (extends the key|is a key and a segment)/);
});

test("only a catalog made by messageCatalog is accepted where a catalog is required", () => {
  assert.equal(requireMessageCatalog(notes), notes);
  assert.throws(() => requireMessageCatalog({ ...notes }), /MESSAGE_CATALOG: messages is not a catalog/);
});

test("the generated keys module is a projection of the bundles: same input, same text; a bundle file name is its locale", () => {
  const bundles = new Map([["en", '{ "notes": { "title": "Notes" } }']]);
  const first = generateMessageKeys(bundles, { catalogModule: "desert-sdk/src/index.ts", command: "npm run messages:write" });
  assert.equal(first, generateMessageKeys(bundles, { catalogModule: "desert-sdk/src/index.ts", command: "npm run messages:write" }));
  assert.match(first, /^\/\/ Generated from en\.json by `npm run messages:write`; do not edit\.\nimport \{ messageCatalog \} from "desert-sdk\/src\/index\.ts";/);
  assert.match(first, /"en": \{\n {4}"notes": \{\n {6}"title": "Notes"\n {4}\}\n {2}\},\n\} as const\);/);
  assert.throws(() => generateMessageKeys(new Map(), { catalogModule: "x", command: "y" }), /MESSAGE_CATALOG: a message catalog needs at least one/);
  assert.throws(() => generateMessageKeys(new Map([["en", "{"]]), { catalogModule: "x", command: "y" }), /MESSAGE_CATALOG: en\.json is not JSON/);
  assert.equal(bundleLocale("en.json"), "en");
  assert.equal(bundleLocale("pt-BR.json"), "pt-BR");
  assert.equal(bundleLocale("keys.ts"), undefined);
});

test("the SDK catalog: every code a person can see is an errors key, and the generated accessor reaches it", async () => {
  const bundle = JSON.parse(await readFile(new URL("../src/messages/en.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(bundle.errors).sort(), [...surfaceErrorCodes].sort());
  assert.deepEqual(m.errors.CONTRACT_MISMATCH, { key: "errors.CONTRACT_MISMATCH" });
  assert.equal(Value.Check(MessageKeySchema, "errors.CONTRACT_MISMATCH"), true);
  assert.equal(Messages.bundle("en").text(m.errors.CONTRACT_MISMATCH), "The surface and controller use different contracts. This session cannot continue safely.");
});
