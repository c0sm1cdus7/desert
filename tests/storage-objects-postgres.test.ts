import test from "node:test";
import assert from "node:assert/strict";
import { loadDefinition } from "../src/compiled-definition.ts";
import { objectStorage } from "../src/storage/ddl.ts";
import { database, tableCount } from "./support/storage-database.ts";
import { storedProducts } from "../scripts/storage-products.ts";
import { StorageKinds } from "./fixtures/storage-kinds.ts";
import { SharedProduct } from "./fixtures/shared-controller.ts";
import { LabeledItems } from "./fixtures/labels.ts";
import { Images } from "./fixtures/image-input.ts";
import { application as privatePhotos } from "./fixtures/private-images.ts";
import { mediaApplication } from "./fixtures/private-media.ts";
import { MultiNotebook } from "./fixtures/multi-view-program.ts";
import { reviewProduct } from "./fixtures/review-product.ts";
import { AuthoredMultiProduct } from "./fixtures/authored-multi-product.ts";
import { InspectionProduct } from "./fixtures/inspection-product.ts";

type Stored = Readonly<{ id: string; objects: readonly unknown[] }>;
// Every product the repository builds against Postgres: products/ (committed DDL) and every distinct product the
// tests/fixtures modules export (found 2026-10-24 by importing each module and checking its exports).
const fixtures: readonly Stored[] = [
  ...storedProducts, StorageKinds, SharedProduct, LabeledItems, Images, loadDefinition(privatePhotos),
  loadDefinition(mediaApplication), MultiNotebook, AuthoredMultiProduct.definition, InspectionProduct.definition,
  reviewProduct().Product.definition, reviewProduct({ renamed: true }).Product.definition,
];

test("every product's generated DDL applies to a fresh database, twice, with one table per object and per reference fact", async () => {
  for (const definition of fixtures) {
    const pool = await database(definition);
    const storage = objectStorage(definition);
    assert.equal(await tableCount(pool, storage.namespace), storage.tables.length, definition.id);
    assert.equal(storage.tables.length >= definition.objects.length, true);
  }
});

test("tenancy: every product lives in its own schema, so all of them install side by side in one database", async () => {
  const pool = await database(...fixtures.filter((definition, index) => fixtures.findIndex(other => other.id === definition.id) === index));
  const namespaces = new Set(fixtures.map(definition => objectStorage(definition).namespace));
  assert.equal(namespaces.size, new Set(fixtures.map(definition => definition.id)).size);
  for (const namespace of namespaces) assert.ok(await tableCount(pool, namespace) > 0, namespace);
});
