import test from "node:test";
import assert from "node:assert/strict";
import { resolvedNode, ResolvedNodeVersion as version } from "../src/interaction/resolved-node.ts";
import { nodeEvent } from "../src/interaction/node-events.ts";
import { ResolvedNodes } from "../src/interaction/catalog.ts";

const item = { version, kind: "catalog.card", record: "place.1", title: "Blue Lake",
  image: { asset: "lake", alt: "A blue lake" }, presentation: "item" } as const;
const featured = { ...item, presentation: "featured", eyebrow: "Featured", actionLabel: "Explore" } as const;

test("public catalog nodes belong to the same closed versioned bank", () => {
  assert.equal(ResolvedNodes.version, "0.5.0");
  assert.deepEqual(ResolvedNodes.entries.filter(entry => entry.id.startsWith("catalog.")).map(entry => entry.id),
    ["catalog.card", "catalog.home", "catalog.detail"]);
  assert.deepEqual(resolvedNode(item), item);
  assert.deepEqual(resolvedNode(featured), featured);
  assert.deepEqual(resolvedNode({ version, kind: "catalog.home", featured,
    groups: [{ id: "north", title: "North", items: [item] }] }).kind, "catalog.home");
  assert.deepEqual(resolvedNode({ version, kind: "catalog.detail", record: "place.1", title: "Blue Lake",
    image: item.image, description: "A lake." }).kind, "catalog.detail");
  assert.deepEqual(nodeEvent({ kind: "catalog.open", record: "place.1" }), { kind: "catalog.open", record: "place.1" });
  assert.deepEqual(nodeEvent({ kind: "catalog.back" }), { kind: "catalog.back" });
  assert.deepEqual(nodeEvent({ kind: "catalog.search", query: "lake" }), { kind: "catalog.search", query: "lake" });
});

test("featured and item semantics reject contradictory and renderer-only anatomy", () => {
  for (const bad of [
    { ...item, eyebrow: "Invented caption" }, { ...item, presentation: "featured" },
    { ...featured, image: { ...featured.image, src: "/secret.jpg" } },
    { ...item, image: { asset: "https://host.test/lake.jpg", alt: "Lake" } },
    { ...item, class: "hero" }, { ...item, children: "<img/>" }, { ...item, onclick: () => {} },
    { version, kind: "catalog.home", featured: item, groups: [] },
    { version, kind: "catalog.home", featured, groups: [{ id: "north", title: "North", items: [featured] }] },
  ]) assert.throws(() => resolvedNode(bad), /INVALID|JSON/);
});
