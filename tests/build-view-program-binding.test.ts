import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile, composeProduct } from "../src/index.ts";
import { compile as compileContract } from "../src/compile.ts";
import { buildDistribution } from "../src/build/index.ts";
import { serveBuiltIdentitySurface, serveBuiltLocalSurface } from "../src/build/serve.ts";
import { openLocalController } from "../src/local.ts";
import { authoredNotebookSource } from "./fixtures/authored-notebook.ts";
import { NotebookService, NotebookWeb } from "../products/notebook/distributions.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

test("mounting requires the exact admitted View program, not only the domain contract", { timeout: 90000 }, async () => {
  const source = authoredNotebookSource();
  const original = composeProduct({ ...source, label: "Original workspace" });
  const changed = composeProduct({ ...source, label: "Changed workspace", entry: source.destinations[1] });
  const application = compile(original), newer = compile(changed);
  assert.equal(application.digest, newer.digest);
  assert.deepEqual(application.surface("human"), newer.surface("human"));
  assert.notDeepEqual(original.viewProgram, changed.viewProgram);

  const directory = mkdtempSync(join(tmpdir(), "desert-program-binding-"));
  const cluster = postgresCluster();
  const controllers: Awaited<ReturnType<typeof openLocalController>>[] = [];
  let server: Awaited<ReturnType<typeof serveBuiltLocalSurface>> | undefined;
  try {
    await buildDistribution(application, {
      distributions: [NotebookService, NotebookWeb], target: NotebookWeb.id, outputDirectory: join(directory, "web"),
    });
    for (const [candidate, rejection] of [
      [application, undefined], [newer, /BUILD_VIEW_PROGRAM_MISMATCH/],
      [compileContract(original.definition), /COMPOSED_PRODUCT_REQUIRED/],
    ] as const) {
      const controller = await openLocalController(candidate, { ...await cluster.database(), roles: ["notes"] });
      controllers.push(controller);
      const identity = await controller.identities.issue("Program binding witness");
      const options = { buildDirectory: join(directory, "web"), port: 0 };
      for (const mount of [
        () => serveBuiltLocalSurface({ ...options, session: controller.connect(identity.token, "human") }),
        () => serveBuiltIdentitySurface({ ...options, controller, surface: "human" }),
      ]) {
        if (rejection) {
          await assert.rejects(async () => { server = await mount(); }, rejection);
        } else {
          server = await mount();
          assert.equal((await fetch(server.origin)).status, 200);
          await server.close(); server = undefined;
        }
      }
    }
  } finally {
    await server?.close();
    for (const controller of controllers) await controller.close();
    cluster.dispose();
    rmSync(directory, { recursive: true });
  }
});
