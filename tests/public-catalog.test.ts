import test from "node:test";
import assert from "node:assert/strict";
import { compilePublicCatalog, initialPublicCatalogState, projectPublicCatalog, reducePublicCatalog,
  publicCatalogSchemas, requirePublicCatalogCapabilities, PublicCatalogRequirements } from "../src/public-catalog/index.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";

test("public catalog compiles logical assets, exposure and navigation without controller dependencies", () => {
  const input = catalogFixture();
  const compiled = compilePublicCatalog(input);
  assert.equal(compiled.surface.mode, "public-catalog");
  assert.equal(compiled.surface.home.featured.record, "parks.one");
  assert.deepEqual(compiled.surface.home.groups.map(group => group.items.map(item => item.record)), [["parks.one"], ["parks.two"]]);
  assert.deepEqual(compiled.surface.home.featured.image, { asset: "parks.lake", alt: "A blue lake" });
  assert.equal(compiled.assets[0]?.path, "media/lake.jpg");
  assert.equal(JSON.stringify(compiled.surface).includes("media/lake.jpg"), false);
  assert.equal(JSON.stringify(compiled.surface).includes("unexposed-needle"), false);
  const relocated = catalogFixture();
  relocated.source.assets[0]!.path = "another-directory/lake.jpg";
  assert.equal(compilePublicCatalog(relocated).digest, compiled.digest);
  input.source.records[0]!.facts.name = "Mutated";
  assert.equal(compiled.surface.home.featured.title, "Blue Lake");
  assert.ok(Object.isFrozen(compiled.surface.home.groups[0]?.items[0]?.image));
  let state = initialPublicCatalogState();
  state = reducePublicCatalog(compiled.surface, state, { kind: "catalog.search", query: " BLUE  LAKE " });
  assert.deepEqual(projectPublicCatalog(compiled.surface, state).results.map(item => item.record), ["parks.one"]);
  state = reducePublicCatalog(compiled.surface, state, { kind: "catalog.open", record: "parks.one" });
  assert.equal(projectPublicCatalog(compiled.surface, state).content.kind, "catalog.detail");
  state = reducePublicCatalog(compiled.surface, state, { kind: "catalog.back" });
  assert.equal(state.query, " BLUE  LAKE ");
  assert.equal(state.selectedId, null);
  assert.equal(projectPublicCatalog(compiled.surface, { query: "unexposed-needle", selectedId: null }).results.length, 0);
});

test("the same mechanism supports a renamed source, object, fields and assets", () => {
  const input = catalogFixture("gardens");
  const renamed = { ...input, object: { id: "garden", facts: { heading: input.object.facts.name,
    prose: input.object.facts.story, zone: input.object.facts.region, internal: input.object.facts.privateMemo } },
    source: { ...input.source, records: input.source.records.map(record => ({ ...record, facts: {
      heading: record.facts.name, prose: record.facts.story, zone: record.facts.region, internal: record.facts.privateMemo,
    } })) }, view: { ...input.view, title: "heading", description: "prose", home: { ...input.view.home,
      groups: { ...input.view.home.groups, field: "zone" } }, search: { fields: ["heading", "prose", "zone"] } } };
  const surface = compilePublicCatalog(renamed).surface;
  assert.equal(surface.home.featured.record, "gardens.one");
  assert.deepEqual(projectPublicCatalog(surface, { query: "south", selectedId: null }).results.map(item => item.record), ["gardens.two"]);
});

test("catalog compilation rejects unknown vocabulary, broken references and hidden search exposure", () => {
  const mutations: ((input: ReturnType<typeof catalogFixture>) => unknown)[] = [
    input => ({ ...input, css: "display: grid" }), input => ({ ...input, onclick: () => {} }),
    input => ({ ...input, html: "<section/>" }),
    input => { input.source.records[1]!.id = input.source.records[0]!.id; return input; },
    input => { input.source.assets[1]!.id = input.source.assets[0]!.id; return input; },
    input => { input.source.records[0]!.image = "missing"; return input; },
    input => { input.view.home.featured.record = "missing"; return input; },
    input => { input.view.home.groups.entries.pop(); return input; },
    input => { input.view.search.fields.push("privateMemo"); return input; },
    input => { input.view.title = "missing"; return input; },
    input => { input.source.records[0]!.facts.name = ""; return input; },
    input => { input.source.assets[0]!.path = "../private.jpg"; return input; },
    input => { input.source.assets[0]!.path = "/absolute.jpg"; return input; },
    input => { input.source.assets[0]!.path = "https://remote.test/image"; return input; },
    input => { input.source.assets[0]!.path = "media/%2e%2e/private.jpg"; return input; },
    input => ({ ...input, object: { ...input.object, facts: { ...input.object.facts, privateMemo: { kind: "principal" } } } }),
  ];
  for (const mutate of mutations) assert.throws(() => compilePublicCatalog(mutate(catalogFixture())), /INVALID|JSON/);
  const surface = compilePublicCatalog(catalogFixture()).surface;
  assert.throws(() => reducePublicCatalog(surface, initialPublicCatalogState(), { kind: "catalog.open", record: "missing" }), /UNKNOWN/);
  assert.throws(() => reducePublicCatalog(surface, initialPublicCatalogState(), { kind: "catalog.back", save: true } as never), /INVALID/);
  assert.throws(() => projectPublicCatalog(surface, { query: "", selectedId: "missing" }), /UNKNOWN/);
});

test("portable schemas and semantic requirements are data, not claims of native implementation", () => {
  const schemas = publicCatalogSchemas();
  assert.deepEqual(JSON.parse(JSON.stringify(schemas)), schemas);
  assert.ok(Object.isFrozen(schemas));
  assert.equal(PublicCatalogRequirements.protocol, "desert.renderer-requirements/1");
  requirePublicCatalogCapabilities(PublicCatalogRequirements);
  assert.throws(() => requirePublicCatalogCapabilities({ ...PublicCatalogRequirements, nodes: [] }), /MISSING/);
  assert.throws(() => requirePublicCatalogCapabilities({ ...PublicCatalogRequirements, features: [] }), /MISSING/);
  assert.throws(() => requirePublicCatalogCapabilities({ ...PublicCatalogRequirements, pointer: true }), /INVALID/);
});
