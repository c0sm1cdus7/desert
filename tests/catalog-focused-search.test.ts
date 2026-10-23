import test from "node:test";
import assert from "node:assert/strict";
import { compilePublicCatalog } from "../src/public-catalog/index.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";
import { catalogSearchResults, catalogSearchScope } from "../src/svelte/infra/catalog-search.ts";

test("page search names and providers come from the current destination", () => {
  const surface = compilePublicCatalog(catalogFixture()).surface;
  assert.equal(catalogSearchScope(surface, "browse").title, surface.title);
  assert.equal(catalogSearchScope(surface, "bank").title, "Component bank");
  assert.deepEqual(catalogSearchResults(surface, "bank", "north"), []);
  assert.deepEqual(catalogSearchResults(surface, "browse", "south").map(item => item.id), ["parks.two"]);
  assert.deepEqual(catalogSearchResults(surface, "bank", "MONEY").map(item => item.id), ["control.money"]);
  assert.deepEqual(catalogSearchResults(surface, "bank", "money impossible"), []);
  assert.deepEqual(catalogSearchResults(surface, "browse", "   "), []);
});

test("exercise search reads declared section metadata, never entered draft values", () => {
  const surface = compilePublicCatalog({ ...catalogFixture(), exercises: {
    title: "Visit kit", subtitle: "Local controls only.", stacks: [{ id: "planning", title: "Trip planning",
      description: "Name your visit.", items: [{ version: "desert.bank-node/1", kind: "input.text",
        name: "trip", label: "Trip name", value: "private-draft-needle", required: false, disabled: false }] }],
  } }).surface;
  if (!surface.exercises) throw new Error("Fixture must expose exercises");
  const first = surface.exercises.stacks[0]!;
  assert.equal(catalogSearchScope(surface, "travel-kit").title, surface.exercises.title);
  assert.deepEqual(catalogSearchResults(surface, "travel-kit", first.title).map(item => item.id), [first.id]);
  assert.deepEqual(catalogSearchResults(surface, "travel-kit", "Trip name").map(item => item.id), [first.id]);
  assert.deepEqual(catalogSearchResults(surface, "travel-kit", "parks.two"), []);
  assert.deepEqual(catalogSearchResults(surface, "travel-kit", "private-draft-needle"), []);
  assert.match(catalogSearchScope(surface, "travel-kit").description, /not.*draft values/i);
});
