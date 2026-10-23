import assert from "node:assert/strict";
import test from "node:test";
import { readVisualBoundarySources } from "../src/authoring/visual-boundary/source.ts";
import { assertWebCatalogDerivations, type CatalogSource } from "../src/authoring/web-catalog/check.ts";
import { readWebCatalogManifest } from "../src/authoring/web-catalog/manifest.ts";

const root = new URL("..", import.meta.url).pathname;
const sources = await readVisualBoundarySources(root);
const change = (path: string, mutate: (source: string) => string): readonly CatalogSource[] => sources.map(item => {
  if (item.path !== path) return item;
  const source = mutate(item.source);
  assert.notEqual(source, item.source, "the independent mutant must actually change source");
  return { ...item, source };
});

test("a generated gateway cannot substitute another type-compatible drawing owner", () => {
  // Feedback and TextContent both accept {text}; type compatibility is not
  // authorization to replace the registered implementation.
  const candidate = change("src/svelte/adapter-catalog.ts", source =>
    source.replace('from "./pieces/TextContent.svelte"', 'from "./pieces/Feedback.svelte"'));
  assert.throws(() => assertWebCatalogDerivations(candidate), /WEB_CATALOG_DERIVATION/);
});

test("the web manifest cannot register an entry outside the canonical semantic catalog", () => {
  const candidate = change("src/svelte/catalog-manifest.ts", source => source.replace('"input.text"', '"outside.visual"'));
  assert.throws(() => assertWebCatalogDerivations(candidate), /WEB_CATALOG_MANIFEST/);
});

test("generated registry drift fails even when every semantic key is still present", () => {
  const candidate = change("src/svelte/renderer-registry.ts", source => source.replace('availability: Availability,', 'availability: Action,'));
  assert.throws(() => assertWebCatalogDerivations(candidate), /WEB_CATALOG_DERIVATION/);
});

test("current derivations allow formatting/comments but never executable extensions or changed owner types", () => {
  assert.doesNotThrow(() => assertWebCatalogDerivations(sources));
  assert.doesNotThrow(() => assertWebCatalogDerivations(change("src/svelte/renderer-registry.ts", source => `// Explanation.\n${source}`)));
  assert.throws(() => assertWebCatalogDerivations(change("src/svelte/catalog-owner-types.ts", source =>
    source.replace("TextContent: typeof TextOwner", "TextContent: typeof FeedbackOwner"))), /WEB_CATALOG_DERIVATION/);
  assert.throws(() => assertWebCatalogDerivations(change("src/svelte/adapter-catalog.ts", source =>
    source + "\nexport const Unregistered = TextOwner;")), /WEB_CATALOG_DERIVATION/);
});

test("the source manifest is closed literal data and cannot run a registration factory", () => {
  const manifest = sources.find(item => item.path === "src/svelte/catalog-manifest.ts")!.source;
  for (const candidate of [
    manifest.replace('closure: "closed"', 'closure: "approved"'),
    manifest.replace('closure: "closed"', 'closure: "closed", stylesheet: "override.css"'),
    manifest.replace('bank: ["action"]', 'bank: ["input.text"]'),
    manifest.replace('source: "src/svelte/pieces/Action.svelte"', 'source: "src/svelte/pieces/../pieces/Action.svelte"'),
    manifest.replace('"input.text", "input.multiline"', '"input.text"'),
    manifest.replace('version: "desert.web-catalog/1"', 'version: makeVersion()'),
    manifest + '\nthrow new Error("Executed fixture source");',
  ]) assert.throws(() => readWebCatalogManifest(candidate), /WEB_CATALOG_MANIFEST/);
});

test("neither deleting a derivation nor removing its registered owner disables the boundary", () => {
  for (const missing of ["src/svelte/catalog-manifest.ts", "src/svelte/catalog-owner-types.ts", "src/svelte/pieces/TextContent.svelte"]) {
    assert.throws(() => assertWebCatalogDerivations(sources.filter(item => item.path !== missing)), /WEB_CATALOG_DERIVATION/);
  }
});
