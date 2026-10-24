import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sdkRoot } from "./revision.ts";
import { inspectionMedia } from "../../svelte/infra/inspection-media.ts";
import { catalogGateEvidence, runWithCatalogGate } from "../../authoring/catalog/gate/build-gate.ts";

/** The generated SvelteKit project and its worker, without any gate: private to this module. Only `createBuildProject`
 * (gated) and `createEvidenceProject` (test-only, no manifest) reach it. */
function stageBuildProject(module: string, family: "human" | "public-catalog", workerTimeout: number) {
  const directory = mkdtempSync(join(sdkRoot, ".desert-build-"));
  try {
    cpSync(join(sdkRoot, "src/build/svelte/template"), directory, { recursive: true });
    mkdirSync(join(directory, "static/media"), { recursive: true });
    cpSync(join(directory, "static", inspectionMedia.source), join(directory, "static/media", inspectionMedia.asset));
    if (family === "public-catalog") {
      cpSync(join(sdkRoot, "src/build/svelte/public-catalog-page.svelte"), join(directory, "src/routes/+page.svelte"));
      cpSync(join(sdkRoot, "src/build/svelte/public-catalog-app.d.ts"), join(directory, "src/app.d.ts"));
    }
    const config = pathToFileURL(join(sdkRoot, "src/build/svelte/config.mjs")).href;
    writeFileSync(join(directory, "svelte.config.js"), `export { default } from ${JSON.stringify(config)};\n`);
    const vite = pathToFileURL(join(sdkRoot, "src/build/svelte/vite.mjs")).href;
    writeFileSync(join(directory, "vite.config.js"), `export { default } from ${JSON.stringify(vite)};\n`);
    writeFileSync(join(directory, "surface.mjs"), module);
  } catch (error) { rmSync(directory, { recursive: true }); throw error; }
  return { directory,
    worker: (mode: "build" | "check") => promisify(execFile)(process.execPath, [join(sdkRoot, "src/build/svelte/worker.mjs"), mode], {
      cwd: directory, env: { PATH: process.env.PATH ?? "" }, timeout: workerTimeout, maxBuffer: 8 * 1024 * 1024,
    }),
    close() { rmSync(directory, { recursive: true }); },
  };
}

/** The qualified build path: no worker runs before the catalog gate and the migrated boundaries pass. */
export function createBuildProject(module: string, family: "human" | "public-catalog" = "human") {
  const project = stageBuildProject(module, family, 120000);
  return { directory: project.directory,
    async run(mode: "build" | "check") {
      try {
        const output = await runWithCatalogGate(sdkRoot, () => project.worker(mode),
          mode === "build" ? () => emittedStylesheets(join(project.directory, "build")) : undefined);
        return { ...output, gate: catalogGateEvidence };
      } catch (error) {
        throw buildFailure(mode, error);
      }
    },
    close: project.close,
  };
}

/** Every stylesheet the build emitted, for rule G2. */
async function emittedStylesheets(directory: string) {
  const files = await readdir(directory, { recursive: true });
  return await Promise.all(files.filter(path => path.endsWith(".css"))
    .map(async path => ({ path, source: await readFile(join(directory, path), "utf8") })));
}

/** Test-only renderer path (plan 3.5, L5): the project and its worker WITHOUT the catalog gate, so tests can type-check and
 * screenshot pieces while the strict build is red. It writes no manifest, copies nothing out, and refuses to run outside
 * node:test. Reached through src/testing/evidence-project.ts; nothing outside tests may import that module. A test that
 * adds fixture routes (the approval evidence, plan section 8) may give the worker longer than the release build's two minutes. */
export function createEvidenceProject(module: string, family: "human" | "public-catalog" = "human", workerTimeout = 120000) {
  requireTestRun();
  const project = stageBuildProject(module, family, workerTimeout);
  return { directory: project.directory,
    async run(mode: "build" | "check") {
      requireTestRun();
      try { return await project.worker(mode); } catch (error) { throw buildFailure(mode, error); }
    },
    close: project.close,
  };
}
function requireTestRun(): void {
  if (process.env.NODE_TEST_CONTEXT === undefined) throw new Error("EVIDENCE_PROJECT_OUTSIDE_TESTS: the evidence project runs only under node --test");
}

export function buildFailure(mode: "build" | "check", error: unknown): Error {
  const failure = error instanceof Error ? error : new Error(String(error));
  const stdout = Reflect.get(failure, "stdout"), stderr = Reflect.get(failure, "stderr");
  return new Error(`SVELTE_${mode.toUpperCase()}_FAILED\n${failure.message}\n${typeof stdout === "string" ? stdout : ""}\n${typeof stderr === "string" ? stderr : ""}`, { cause: error });
}
