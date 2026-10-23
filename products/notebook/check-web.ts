import { compile } from "../../src/index.ts";
import { buildHumanModule } from "../../src/web/build.ts";
import { createBuildProject } from "../../src/build/svelte/project.ts";
import { fileURLToPath } from "node:url";
import { assertProductSource } from "../../src/authoring/index.ts";

await assertProductSource(fileURLToPath(new URL("./src", import.meta.url)));
const { NotebookProduct } = await import("./product.ts");
const { NotebookWeb } = await import("./distributions.ts");

const project = createBuildProject(await buildHumanModule(compile(NotebookProduct), NotebookWeb.surface));
try { const result = await project.run("check"); console.log(result.stdout); }
finally { project.close(); }
