import test from "node:test";
import assert from "node:assert/strict";
import { bankNode, BankVersion as version } from "../src/interaction/bank-node.ts";
import { bankEvent } from "../src/interaction/bank-events.ts";
import { InteractionCatalog } from "../src/interaction/catalog.ts";

const item = { version, kind: "catalog.card", record: "place.1", title: "Blue Lake",
  image: { asset: "lake", alt: "A blue lake" }, presentation: "item" } as const;
const featured = { ...item, presentation: "featured", eyebrow: "Featured", actionLabel: "Explore" } as const;

test("public catalog nodes belong to the same closed versioned bank", () => {
  assert.equal(InteractionCatalog.version, "0.4.1");
  assert.deepEqual(InteractionCatalog.entries.filter(entry => entry.id.startsWith("catalog.")).map(entry => entry.id),
    ["catalog.card", "catalog.home", "catalog.detail"]);
  assert.deepEqual(bankNode(item), item);
  assert.deepEqual(bankNode(featured), featured);
  assert.deepEqual(bankNode({ version, kind: "catalog.home", featured,
    groups: [{ id: "north", title: "North", items: [item] }] }).kind, "catalog.home");
  assert.deepEqual(bankNode({ version, kind: "catalog.detail", record: "place.1", title: "Blue Lake",
    image: item.image, description: "A lake." }).kind, "catalog.detail");
  assert.deepEqual(bankEvent({ kind: "catalog.open", record: "place.1" }), { kind: "catalog.open", record: "place.1" });
  assert.deepEqual(bankEvent({ kind: "catalog.back" }), { kind: "catalog.back" });
  assert.deepEqual(bankEvent({ kind: "catalog.search", query: "lake" }), { kind: "catalog.search", query: "lake" });
});

test("featured and item semantics reject contradictory and renderer-only anatomy", () => {
  for (const bad of [
    { ...item, eyebrow: "Invented caption" }, { ...item, presentation: "featured" },
    { ...featured, image: { ...featured.image, src: "/secret.jpg" } },
    { ...item, image: { asset: "https://host.test/lake.jpg", alt: "Lake" } },
    { ...item, class: "hero" }, { ...item, children: "<img/>" }, { ...item, onclick: () => {} },
    { version, kind: "catalog.home", featured: item, groups: [] },
    { version, kind: "catalog.home", featured, groups: [{ id: "north", title: "North", items: [featured] }] },
  ]) assert.throws(() => bankNode(bad), /INVALID|JSON/);
});
