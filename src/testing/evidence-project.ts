// Test-only renderer path (plan 3.5, L5): the generated project and its worker without the catalog gate, only under
// node:test, writing no manifest. The factory lives next to the gated one in src/build/svelte/project.ts so the ungated
// project stays private there; this module is the one name tests import, and nothing outside tests may import it.
export { createEvidenceProject } from "../build/svelte/project.ts";
