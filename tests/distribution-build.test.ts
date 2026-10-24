import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, cpSync, symlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { compile, composeProduct } from "../src/index.ts";
import { compile as compileContract } from "../src/compile.ts";
import { buildDistribution, loadVerifiedBuild } from "../src/build/index.ts";
import { serveBuiltLocalSurface } from "../src/build/serve.ts";
import { openLocalController } from "../src/local.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { NotebookProduct } from "../products/notebook/product.ts";
import { notebookDefinition } from "./fixtures/notebook.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { NotebookService, NotebookWeb, NotebookCLI, NotebookIOS } from "../products/notebook/distributions.ts";
import { verifyManifestBoundaries } from "./fixtures/build-manifest.ts";
import { FixtureMessages } from "./fixtures/messages.ts";

test("a declared web distribution produces a built artifact instead of only a plan", { timeout: 90000 }, async () => {
  const directory = mkdtempSync(join(tmpdir(), "desert-build-test-"));
  try {
    const result = await buildDistribution(compile(NotebookProduct), {
      distributions: [NotebookService, NotebookWeb], target: NotebookWeb.id,
      outputDirectory: join(directory, "web"),
    });
    assert.equal(result.status, "built");
    const output = join(directory, "web");
    assert.equal(result.contractDigest, compile(NotebookProduct).digest);
    assert.deepEqual(loadVerifiedBuild(output), result);
    assert.ok(Object.hasOwn(result.files, "web/handler.js"));
    const original = readFileSync(join(output, "web/handler.js"), "utf8");
    await assert.rejects(buildDistribution(compile(NotebookProduct), {
      distributions: [NotebookService, NotebookWeb], target: NotebookWeb.id, outputDirectory: output,
    }), /BUILD_DESTINATION_EXISTS/);
    assert.equal(readFileSync(join(output, "web/handler.js"), "utf8"), original);
    const altered = join(directory, "altered");
    cpSync(output, altered, { recursive: true });
    writeFileSync(join(altered, "web/handler.js"), original + "\nthrow Error('changed');");
    assert.throws(() => loadVerifiedBuild(altered), /BUILD_FILES_MISMATCH/);
    const extra = join(directory, "extra");
    cpSync(output, extra, { recursive: true });
    writeFileSync(join(extra, "unexpected.js"), "");
    assert.throws(() => loadVerifiedBuild(extra), /BUILD_FILES_MISMATCH/);
    const linked = join(directory, "linked");
    cpSync(output, linked, { recursive: true });
    symlinkSync(join(output, "web/handler.js"), join(linked, "external.js"));
    assert.throws(() => loadVerifiedBuild(linked), /BUILD_SYMLINK_REJECTED/);
    await verifySessionBoundary(output, directory);
  } finally { rmSync(directory, { recursive: true }); }
});

async function verifySessionBoundary(output: string, directory: string) {
  const cluster = postgresCluster();
  const controller = await openLocalController(compile(NotebookProduct), { ...await cluster.database(), roles: ["notes"] });
  const identity = await controller.identities.issue("Build test");
  const session = controller.connect(identity.token, "human");
  try {
    await verifyManifestBoundaries(output, directory, session);
    await assert.rejects(serveBuiltLocalSurface({ buildDirectory: output,
      session: controller.connect(identity.token, "agent"), port: 0 }), /BUILD_SURFACE_MISMATCH/);
    await assert.rejects(serveBuiltLocalSurface({ buildDirectory: output, session: { ...session }, port: 0 }),
      /UNTRUSTED_LOCAL_SESSION/);
    await assert.rejects(serveBuiltLocalSurface({ buildDirectory: join(directory, "altered"), session, port: 0 }),
      /BUILD_FILES_MISMATCH/);
    const changed = notebookDefinition();
    changed.objects[0].facts.title.minLength = 2;
    const newer = await openLocalController(compileContract(changed), { ...await cluster.database(), roles: ["notes"] });
    try {
      const actor = await newer.identities.issue("Other revision");
      await assert.rejects(serveBuiltLocalSurface({ buildDirectory: output,
        session: newer.connect(actor.token, "human"), port: 0 }), /BUILD_CONTRACT_MISMATCH/);
    } finally { await newer.close(); }
    const server = await serveBuiltLocalSurface({ buildDirectory: output, session, port: 0 });
    try {
      const response = await fetch(server.origin);
      assert.equal(response.status, 200);
      const html = await response.text();
      const asset = html.match(/\.\/(_app\/immutable\/entry\/[^"]+\.js)/)?.[1];
      assert.ok(asset);
      const before = await (await fetch(server.origin + "/" + asset)).text();
      writeFileSync(join(output, "web/client", asset), "CHANGED_AFTER_MOUNT");
      assert.equal(await (await fetch(server.origin + "/" + asset)).text(), before);
      assert.equal((await fetch(server.origin + "/DESERT-BUILD.json")).status, 404);
      assert.equal((await fetch(server.origin + "/web/handler.js")).status, 404);
      assert.equal((await fetch(server.origin + "/unknown-page")).status, 404);
      assert.equal((await fetch(server.origin, { method: "POST" })).status, 405);
    } finally { await server.close(); }
  } finally { await controller.close(); cluster.dispose(); }
}

test("uninstalled builders and unsupported web bindings never publish an output", async () => {
  const directory = mkdtempSync(join(tmpdir(), "desert-unsupported-build-"));
  try {
    for (const target of [NotebookCLI, NotebookIOS, NotebookService]) {
      const output = join(directory, target.id);
      await assert.rejects(buildDistribution(compile(NotebookProduct), {
        distributions: [NotebookService, NotebookWeb, NotebookCLI, NotebookIOS], target: target.id, outputDirectory: output,
      }), /BUILDER_NOT_INSTALLED/);
      assert.equal(existsSync(output), false);
    }
    const localWeb = { ...NotebookWeb, bindings: [{ kind: "local", dependency: "notes", adapter: "uninstalled" }] };
    await assert.rejects(buildDistribution(compile(NotebookProduct), {
      distributions: [localWeb], target: localWeb.id, outputDirectory: join(directory, "local"),
    }), /UNSUPPORTED_WEB_BINDING/);
    assert.equal(existsSync(join(directory, "local")), false);
    const source = authoredNotebookSource();
    const note = source.objects[0];
    const unsupported = composeProduct({ ...source, objects: [{ ...note,
      facts: { ...note.facts, title: { kind: "integer", minimum: 1, maximum: 10 } } }] });
    await assert.rejects(buildDistribution(compile(unsupported), {
      distributions: [NotebookService, NotebookWeb], target: NotebookWeb.id,
      outputDirectory: join(directory, "primitive"),
    }), /UNSUPPORTED_FORM_PRIMITIVE/);
    assert.equal(existsSync(join(directory, "primitive")), false);
  } finally { rmSync(directory, { recursive: true }); }
});
