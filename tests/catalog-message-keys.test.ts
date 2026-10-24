// Rule B, messages (plan §14): a piece declares the message keys it uses; every declared key exists in every SDK bundle
// (MESSAGE_MISSING); every bundle key is owned once, by a piece or by a namespace module (CATALOG_DECLARATION); a purpose
// given as a key is one of the piece's own messages.
import assert from "node:assert/strict";
import test from "node:test";
import { assertMessageOwnership } from "../src/authoring/catalog/gate/message-keys.ts";
import { readDeclarations } from "../src/authoring/catalog/read-declaration.ts";
import { surfaceErrorCodes } from "../src/messages/error-codes.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { testLayout } from "./support/catalog-layout.ts";

const layout = testLayout({ messages: { folder: "src/messages", keys: "src/messages/keys.ts", namespaces: { feedback: "src/web/client/failure-feedback.ts" } } });
const field = (extra = "", purpose = '"x"') => readDeclarations("src/svelte/catalog/foundations/field/field.catalog.ts", `import { C } from "./c.ts";
export const F = defineFoundation({ id: "field", purpose: ${purpose}, owner: { entry: "Field.svelte" }, shape: "radius",
  states: ["empty"], approval: "required", contract: C${extra} } as const);`).map(declaration => ({ path: "src/svelte/catalog/foundations/field/field.catalog.ts", declaration }));
const bundles = (en: object, others: Record<string, object> = {}) =>
  new Map(Object.entries({ en, ...others }).map(([locale, tree]) => [locale, JSON.stringify(tree)]));
const owned = { field: { clear: "Clear {label}", purpose: "A labelled well." }, feedback: { failed: { title: "Failed" } } };
const declared = ', messages: ["field.clear", "field.purpose"]';

test("control: every key is owned once and every declared key exists in every locale", () => {
  assert.doesNotThrow(() => assertMessageOwnership(field(declared, '{ key: "field.purpose" }'), bundles(owned, { es: owned }), layout));
});

test("MESSAGE_MISSING: a declared key absent from a locale's bundle (N57's law)", () => {
  assert.throws(() => assertMessageOwnership(field(', messages: ["field.clear", "field.missing"]'), bundles(owned), layout),
    { message: "MESSAGE_MISSING: field declares field.missing, which the en bundle lacks" });
  assert.throws(() => assertMessageOwnership(field(declared), bundles(owned, { es: { ...owned, field: { clear: "Borrar {label}" } } }), layout),
    { message: "MESSAGE_MISSING: field declares field.purpose, which the es bundle lacks" });
});

test("CATALOG_DECLARATION: a key owned by no piece (N58's law), and a key two pieces claim", () => {
  assert.throws(() => assertMessageOwnership(field(declared), bundles({ ...owned, orphan: { key: "Nobody" } }), layout),
    { message: "CATALOG_DECLARATION: orphan.key in en.json is owned by no piece and by no namespace module" });
  const second = readDeclarations("src/svelte/catalog/compositions/lock/lock.catalog.ts", `import { C } from "./c.ts";
export const L = defineComposition({ id: "lock", purpose: "x", owner: { entry: "Lock.svelte" }, uses: [], approval: "none", contract: C,
  messages: ["field.clear"] } as const);`).map(declaration => ({ path: "src/svelte/catalog/compositions/lock/lock.catalog.ts", declaration }));
  assert.throws(() => assertMessageOwnership([...field(declared), ...second], bundles(owned), layout),
    { message: "CATALOG_DECLARATION: field.clear is declared by field and lock; a message has one owner" });
});

test("CATALOG_DECLARATION: a purpose key the piece does not declare as its message", () => {
  assert.throws(() => assertMessageOwnership(field(', messages: ["field.clear"]', '{ key: "field.purpose" }'), bundles(owned), layout),
    { message: "CATALOG_DECLARATION: field's purpose is field.purpose, which field does not list in messages" });
});

test("the errors namespace is exactly the codes a person can see, each with its sentence in every bundle", () => {
  const errors = Object.fromEntries(surfaceErrorCodes.map(code => [code, "x"]));
  const desert = { ...DesertLayout.messages, namespaces: { errors: "src/messages/error-codes.ts", feedback: "f.ts" } };
  const check = (tree: object) => () => assertMessageOwnership([], bundles(tree), testLayout({ messages: desert }));
  assert.doesNotThrow(check({ errors }));
  const { CONTRACT_MISMATCH: _, ...missing } = errors;
  assert.throws(check({ errors: missing }), { message: "MESSAGE_MISSING: the error code CONTRACT_MISMATCH reaches a person and en.json has no errors.CONTRACT_MISMATCH" });
  assert.throws(check({ errors: { ...errors, NOT_A_SURFACE_CODE: "x" } }),
    { message: "CATALOG_DECLARATION: errors.NOT_A_SURFACE_CODE in en.json names no code a person can see (src/messages/error-codes.ts)" });
});
