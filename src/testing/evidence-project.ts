// Test-only renderer path (plan 3.5, L5): the generated project and its worker WITHOUT the catalog gate, so tests can
// type-check and screenshot pieces while the strict build is red (slices 1–5). It writes no manifest, copies nothing out,
// and refuses to run outside node:test. Rule I refuses any src/build or src/svelte file that imports src/testing.
import { buildFailure, stageBuildProject } from "../build/svelte/project.ts";

function requireTestRun(): void {
  if (process.env.NODE_TEST_CONTEXT === undefined) throw new Error("EVIDENCE_PROJECT_OUTSIDE_TESTS: the evidence project runs only under node --test");
}

export function createEvidenceProject(module: string, family: "human" | "public-catalog" = "human") {
  requireTestRun();
  const project = stageBuildProject(module, family);
  return { directory: project.directory,
    async run(mode: "build" | "check") {
      requireTestRun();
      try { return await project.worker(mode); } catch (error) { throw buildFailure(mode, error); }
    },
    close: project.close,
  };
}
