import assert from "node:assert/strict";
import test from "node:test";
import { cp, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readVisualBoundarySources, runWithVisualBoundaries } from "../src/authoring/visual-boundary/source.ts";
import { requiredBootstrapSources } from "../src/authoring/visual-boundary/bootstrap.ts";

test("both generated Svelte build and check run behind the shared visual boundary", async () => {
  const source = await readFile(new URL("../src/build/svelte/project.ts", import.meta.url), "utf8");
  assert.match(source, /runWithVisualBoundaries\(sdkRoot,\s*\(\)\s*=>\s*promisify\(execFile\)/,
    "the actual worker invocation, not an optional CLI command, must be guarded");
});

test("unsafe dormant renderer source rejects before the worker; safe source retains its result", async () => {
  const root = await mkdtemp(join(tmpdir(), "desert-visual-build-gate-"));
  let calls = 0;
  const worker = async () => { calls++; return "built"; };
  try {
    // Mutate a complete real source graph: fake empty contracts can hide the
    // boundary under test behind unrelated missing-manifest/dependency failures.
    await cp(new URL("../src", import.meta.url), join(root, "src"), { recursive: true });
    await writeFile(join(root, "src/svelte/catalog/renderer/frame-body/FrameBody.svelte"), "<div>Forbidden renderer markup</div>");
    await writeFile(join(root, "src/svelte/style.css"), ":root { color: inherit; }");
    await assert.rejects(runWithVisualBoundaries(root, worker), /CLOSED_VISUAL_BOUNDARY/);
    assert.equal(calls, 0);
    assert.ok((await readVisualBoundarySources(root)).some(item => item.path === "src/svelte/style.css"),
      "CSS participates even when no preview imports it");
    await writeFile(join(root, "src/svelte/catalog/renderer/frame-body/FrameBody.svelte"), "<!-- no renderer-owned paint -->");
    await rm(join(root, "src/svelte/catalog/renderer/bank-renderer/BankRenderer.svelte"));
    await assert.rejects(runWithVisualBoundaries(root, worker), /CLOSED_VISUAL_BOUNDARY.*BankRenderer/);
    assert.equal(calls, 0, "removing the dispatcher cannot disable its finite gate");
    await writeFile(join(root, "src/svelte/catalog/renderer/bank-renderer/BankRenderer.svelte"), await readFile(new URL("../src/svelte/catalog/renderer/bank-renderer/BankRenderer.svelte", import.meta.url)));
    assert.equal(await runWithVisualBoundaries(root, worker), "built");
    assert.equal(calls, 1);
    await writeFile(join(root, "src/svelte/catalog/renderer/frame-body/FrameBody.svelte"), '<script>import "./theme.css?direct";</script>');
    await assert.rejects(runWithVisualBoundaries(root, worker), /PRIVATE_VISUAL_IMPORT/);
    assert.equal(calls, 1, "a stylesheet query cannot reach the worker from a sealed adapter");
    await writeFile(join(root, "src/svelte/catalog/renderer/frame-body/FrameBody.svelte"), "<!-- no renderer-owned paint -->");
    await rm(join(root, requiredBootstrapSources[0]!));
    await assert.rejects(runWithVisualBoundaries(root, worker), /CLOSED_VISUAL_BOOTSTRAP.*missing source/);
    assert.equal(calls, 1, "removing the bootstrap cannot silently remove its theme or its guard");
    await writeFile(join(root, requiredBootstrapSources[0]!), await readFile(new URL(`../${requiredBootstrapSources[0]}`, import.meta.url)));
    await rm(join(root, "src/svelte/catalog/renderer/frame-body/FrameBody.svelte"));
    await assert.rejects(runWithVisualBoundaries(root, worker), /CLOSED_VISUAL_BOUNDARY.*FrameBody/);
    assert.equal(calls, 1, "missing or renamed sealed sources cannot silently disable the guard");
    await writeFile(join(root, "src/svelte/catalog/renderer/frame-body/FrameBody.svelte"), "<!-- no renderer-owned paint -->");
    await symlink(join(root, "src/svelte/catalog/renderer/frame-body/FrameBody.svelte"), join(root, "src/build/svelte/linked.svelte"));
    await assert.rejects(runWithVisualBoundaries(root, worker), /VISUAL_SOURCE_SYMLINK/);
    assert.equal(calls, 1);
  } finally { await rm(root, { recursive: true }); }
});
