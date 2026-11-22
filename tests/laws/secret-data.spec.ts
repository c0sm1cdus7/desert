import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
import { dataCases, rejectedDataCases, admittedRevisedCases } from "./secret-data-cases.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
for (const [name, code] of Object.entries(dataCases))
  for (const mode of ["direct", "loop", "imported"])
    it(`212 data: admits ${name} ${mode}`, () => {
      const body = mode === "loop" ? `for (let round = 0; round < 2; round++) { ${code} }` : code;
      const helper = `export function read() { ${body} }`;
      const sources =
        mode === "imported"
          ? {
              "tool.ts": "import { read } from './helper.ts'; export const tool = { acts: { run: read } };",
              "helper.ts": helper,
            }
          : { "tool.ts": helper };
      expect(secretBoundaryViolations(sources, policy)).toEqual([]);
    });
for (const [name, code] of Object.entries(admittedRevisedCases))
  it(`212 data: now admits ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy)).toEqual([]);
  });
for (const [name, code] of Object.entries(rejectedDataCases))
  it(`212 data: rejects ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length).toBeGreaterThan(0);
  });
it("212 data: a real composition reaches tables in tools and imported helpers", () => {
  const home = mkdtempSync(join(tmpdir(), "secret-data-"));
  try {
    mkdirSync(join(home, "src"));
    mkdirSync(join(home, "lib"));
    writeFileSync(
      join(home, "package.json"),
      JSON.stringify({ desert: { kind: "distribution", program: "src/main.ts" } }),
    );
    writeFileSync(join(home, "tsconfig.json"), JSON.stringify({ compilerOptions: {} }));
    writeFileSync(
      join(home, "src/main.ts"),
      "import { tool } from './tool.ts'; export const program = { registry: [tool] };",
    );
    const helpers = Object.entries(dataCases)
      .map(([name, body]) => `export function ${name}() { ${body} }`)
      .join("\n");
    writeFileSync(join(home, "lib/data.ts"), helpers);
    writeFileSync(
      join(home, "src/tool.ts"),
      "import { list, tuple, text, table, byId } from '../lib/data.ts';" +
        "export const tool = { acts: { run: () => [list(), tuple(), text(), table(), byId()] } };",
    );
    expect(programSecretBoundaries(home)).toEqual([]);
    writeFileSync(join(home, "lib/data.ts"), helpers + "\nconst target = {}; target.__proto__;");
    expect(programSecretBoundaries(home).some(item => item.includes("__proto__"))).toBe(true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
