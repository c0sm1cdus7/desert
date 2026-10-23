import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { sdkRoot } from "./revision.ts";
import { inspectionMedia } from "../../svelte/infra/inspection-media.ts";
import { runWithVisualBoundaries } from "../../authoring/visual-boundary/source.ts";

export function createBuildProject(module: string, family: "human" | "public-catalog" = "human") {
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
    async run(mode: "build" | "check") {
      try {
        return await runWithVisualBoundaries(sdkRoot, () => promisify(execFile)(process.execPath, [join(sdkRoot, "src/build/svelte/worker.mjs"), mode], {
          cwd: directory, env: { PATH: process.env.PATH ?? "" }, timeout: 120000, maxBuffer: 8 * 1024 * 1024,
        }));
      } catch (error) {
        const failure = error as Error & { stdout?: string, stderr?: string };
        throw new Error(`SVELTE_${mode.toUpperCase()}_FAILED\n${failure.message}\n${failure.stdout ?? ""}\n${failure.stderr ?? ""}`, { cause: error });
      }
    },
    close() { rmSync(directory, { recursive: true }); },
  };
}
