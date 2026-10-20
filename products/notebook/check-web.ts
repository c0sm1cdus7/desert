import { compile } from "../../src/index.ts";
import { buildHumanModule } from "../../src/web/build.ts";
import { createBuildProject } from "../../src/build/svelte/project.ts";
import { Notebook } from "./product.ts";
import { NotebookWeb } from "./distributions.ts";

const project = createBuildProject(await buildHumanModule(compile(Notebook), NotebookWeb.surface));
try { const result = await project.run("check"); console.log(result.stdout); }
finally { project.close(); }
