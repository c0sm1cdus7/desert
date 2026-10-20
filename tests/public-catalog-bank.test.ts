import assert from "node:assert/strict";
import test from "node:test";
import { compilePublicCatalog } from "../src/public-catalog/index.ts";
import { catalogFixture } from "./fixtures/public-catalog.ts";
import { InteractionCatalog } from "../src/interaction/catalog.ts";
import { bankNode } from "../src/interaction/bank-node.ts";
import { publicCatalogBankInventory } from "../src/svelte/explorer/PublicCatalogBank-model.ts";

test("public diagnostic bank accounts for every canonical entry/state without fabricating domain execution", () => {
  const surface = compilePublicCatalog(catalogFixture()).surface;
  const inventory = publicCatalogBankInventory(surface);
  assert.deepEqual(inventory.map(item => `${item.id}:${item.state}`),
    InteractionCatalog.entries.flatMap(entry => entry.states.map(state => `${entry.id}:${state}`)));
  assert.deepEqual(inventory.filter(item => item.gap).map(item => `${item.id}:${item.state}`),
    ["collection:empty", "form:incomplete", "form:ready", "form:disconnected", "context:unavailable", "review:prepared", "review:uncertain"]);
  const installedAssets = new Set(surface.details.map(detail => detail.image.asset));
  function assertInstalledAssets(value: unknown): void {
    if (Array.isArray(value)) { value.forEach(assertInstalledAssets); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "asset") assert.ok(installedAssets.has(String(child)), `Unbound asset: ${child}`);
      else assertInstalledAssets(child);
    }
  }
  for (const item of inventory) {
    assert.equal(Number(!!item.node) + Number(!!item.gap) + Number(item.owner === "control-bank"), 1);
    if (!item.node) continue;
    assert.deepEqual(bankNode(item.node), item.node);
    const serialized = JSON.stringify(item.node);
    assert.equal(serialized.includes('"kind":"journey"'), false);
    assert.equal(serialized.includes('"kind":"accept"'), false);
    if (item.node.kind.startsWith("catalog.")) assertInstalledAssets(item.node);
  }
  assert.equal(inventory.find(item => item.id === "catalog.home")?.node, surface.home);
  assert.equal(inventory.find(item => item.id === "catalog.detail")?.node, surface.details[0]);
});
