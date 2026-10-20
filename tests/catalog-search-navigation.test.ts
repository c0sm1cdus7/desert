import test from "node:test";
import assert from "node:assert/strict";
import { compilePublicCatalog, projectPublicCatalog, reducePublicCatalog } from "../src/public-catalog/index.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";

test("a new global search leaves detail and shows its results on every surface", () => {
  const surface = compilePublicCatalog(catalogFixture()).surface;
  const detail = { query: "blue", selectedId: "parks.one" };
  const next = reducePublicCatalog(surface, detail, { kind: "catalog.search", query: "south" });
  assert.deepEqual(next, { query: "south", selectedId: null });
  assert.deepEqual(projectPublicCatalog(surface, next).results.map(item => item.record), ["parks.two"]);
  assert.deepEqual(detail, { query: "blue", selectedId: "parks.one" });
});
