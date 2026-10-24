import { cpSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildHumanModule } from "../../web/build.ts";
import { createBuildProject } from "./project.ts";
import { rendererRevision } from "./revision.ts";
import { webConnection, type Application, type ClientPlan } from "../plan.ts";

export const svelteWebBuilder = Object.freeze({
  id: "svelte-web",
  revision: rendererRevision,
  async prepare(application: Application, plan: ClientPlan) {
    const connection = webConnection(plan);
    const module = await buildHumanModule(application, plan.surface);
    return { connection,
      async build(destination: string) {
        const project = createBuildProject(module);
        try {
          const { gate } = await project.run("build");
          mkdirSync(join(destination, "web"));
          cpSync(join(project.directory, "build"), join(destination, "web"), { recursive: true });
          writeFileSync(join(destination, "package.json"), JSON.stringify({ private: true, type: "module" }) + "\n");
          return { gate };
        } finally { project.close(); }
      },
    };
  },
});
