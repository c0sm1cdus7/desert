import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sdkRoot } from "./revision.ts";
import { inspectionMedia } from "../../svelte/infra/inspection-media.ts";
import { catalogGateEvidence, runWithVisualBoundaries } from "../../authoring/visual-boundary/source.ts";

/** The generated SvelteKit project and its worker, without any gate. Only `createBuildProject` (gated) and the test-only
 * evidence project (`src/testing/evidence-project.ts`, which writes no manifest) may use it. */
export function stageBuildProject(module: string, family: "human" | "public-catalog" = "human") {
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
      cwd: directory, env: { PATH: process.env.PATH ?? "" }, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
    }),
    close() { rmSync(directory, { recursive: true }); },
  };
}

/** The qualified build path: no worker runs before the catalog gate and the migrated boundaries pass. */
export function createBuildProject(module: string, family: "human" | "public-catalog" = "human") {
  const project = stageBuildProject(module, family);
  return { directory: project.directory,
    async run(mode: "build" | "check") {
      try {
        const output = await runWithVisualBoundaries(sdkRoot, () => project.worker(mode),
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

export function buildFailure(mode: "build" | "check", error: unknown): Error {
  const failure = error instanceof Error ? error : new Error(String(error));
  const stdout = Reflect.get(failure, "stdout"), stderr = Reflect.get(failure, "stderr");
  return new Error(`SVELTE_${mode.toUpperCase()}_FAILED\n${failure.message}\n${typeof stdout === "string" ? stdout : ""}\n${typeof stderr === "string" ? stderr : ""}`, { cause: error });
}
