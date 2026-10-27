import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runWithCatalogGate } from "../src/authoring/catalog/gate/build-gate.ts";

test("both generated Svelte build and check run behind the catalog gate", async () => {
  const source = await readFile(new URL("../src/build/svelte/project.ts", import.meta.url), "utf8");
  assert.match(source, /runWithCatalogGate\(sdkRoot,\s*\(\)\s*=>\s*project\.worker\(mode\),/,
    "the actual worker invocation, not an optional CLI command, must be guarded");
});

test("unsafe dormant renderer source rejects before the worker, and removing a guarded source cannot disable the gate", async () => {
  const root = await mkdtemp(join(tmpdir(), "desert-visual-build-gate-"));
  let calls = 0;
  const worker = async () => { calls++; return "built"; };
  const frameBody = "src/svelte/catalog/renderer/frame-body/FrameBody.svelte", layout = "src/build/svelte/template/src/routes/+layout.svelte";
  const original = async (path: string) => readFile(new URL(`../${path}`, import.meta.url));
  try {
    // Mutate a complete real source graph, so the boundary under test is the one that answers.
    await cp(new URL("../src", import.meta.url), join(root, "src"), { recursive: true });
    await writeFile(join(root, frameBody), "<div>Forbidden renderer markup</div>");
    await writeFile(join(root, "src/svelte/style.css"), ":root { color: inherit; }");
    await assert.rejects(runWithCatalogGate(root, worker), /UNDECLARED_VISUAL_SOURCE: .*src\/svelte\/style\.css/,
      "an undeclared stylesheet is refused by rule A even when no preview imports it");
    await rm(join(root, "src/svelte/style.css"));
    await assert.rejects(runWithCatalogGate(root, worker), /COMPOSITION_NATIVE_ELEMENT: src\/svelte\/catalog\/renderer\/frame-body\/FrameBody\.svelte/);
    assert.equal(calls, 0);
    await writeFile(join(root, frameBody), '<script>import "../../../theme.css?direct";</script>');
    await assert.rejects(runWithCatalogGate(root, worker), /CROSS_OWNER_CSS: src\/svelte\/catalog\/renderer\/frame-body\/FrameBody\.svelte/);
    assert.equal(calls, 0, "a stylesheet query cannot reach the worker from a renderer composition");
    await writeFile(join(root, frameBody), "<!-- no renderer-owned paint -->");
    await rm(join(root, "src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte"));
    await assert.rejects(runWithCatalogGate(root, worker), /CATALOG_DECLARATION: .*NodeRenderer/);
    assert.equal(calls, 0, "removing the dispatcher cannot disable its grammar");
    await writeFile(join(root, "src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte"), await original("src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte"));
    await rm(join(root, layout));
    await assert.rejects(runWithCatalogGate(root, worker), /UNQUALIFIED_ARTIFACT/);
    assert.equal(calls, 0, "removing the bootstrap cannot silently remove its theme or its guard");
    await writeFile(join(root, layout), await original(layout));
    await rm(join(root, "src/svelte/renderer-registry.ts"));
    await assert.rejects(runWithCatalogGate(root, worker), /CATALOG_DERIVATION: src\/svelte\/renderer-registry\.ts is missing/);
    await writeFile(join(root, "src/svelte/renderer-registry.ts"), await original("src/svelte/renderer-registry.ts"));
    await rm(join(root, frameBody));
    await assert.rejects(runWithCatalogGate(root, worker), /CATALOG_DECLARATION: .*FrameBody/);
    assert.equal(calls, 0, "missing or renamed sources cannot silently disable the gate");
    await writeFile(join(root, frameBody), "<!-- no renderer-owned paint -->");
    await symlink(join(root, frameBody), join(root, "src/build/svelte/linked.svelte"));
    await assert.rejects(runWithCatalogGate(root, worker), /VISUAL_SOURCE_SYMLINK/);
    assert.equal(calls, 0);
  } finally { await rm(root, { recursive: true }); }
});
