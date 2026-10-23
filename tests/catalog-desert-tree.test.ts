// The DESERT tree itself satisfies every implemented catalog rule: no undeclared visual file, consistent
// declarations, and a ledger that names every piece. Slice-0 exit condition, kept as a permanent guard.
import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runCatalogGate } from "../src/authoring/catalog/gate/run.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";

const root = fileURLToPath(new URL("..", import.meta.url));

test("the DESERT tree passes rules A, B and L", async () => {
  const tree = await runCatalogGate(root, { layout: DesertLayout, rules: ["A", "B", "L"] });
  assert.ok(tree.declarations.length > 0);
});

test("no piece of the DESERT tree is approved before the owner stamps it", async () => {
  const tree = await runCatalogGate(root, { layout: DesertLayout, rules: ["L"] });
  const approved = Object.entries(Object(tree.ledger).pieces ?? {}).filter(([, entry]) => Object(entry).status === "approved");
  assert.deepEqual(approved, [], "slice 0 records today's pieces as implemented; only the approve command run by the owner stamps them");
});
