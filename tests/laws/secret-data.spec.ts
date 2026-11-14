import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
import { dataCases, rejectedDataCases } from "./secret-data-cases.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
for (const [name, code] of Object.entries(dataCases))
  for (const mode of ["directo", "bucle", "importado"])
    it(`212 datos: admite ${name} ${mode}`, () => {
      const body = mode === "bucle" ? `for (let vuelta = 0; vuelta < 2; vuelta++) { ${code} }` : code;
      const helper = `export function leer() { ${body} }`;
      const sources =
        mode === "importado"
          ? {
              "tool.ts": "import { leer } from './helper.ts'; export const tool = { acts: { run: leer } };",
              "helper.ts": helper,
            }
          : { "tool.ts": helper };
      expect(secretBoundaryViolations(sources, policy)).toEqual([]);
    });
for (const [name, code] of Object.entries(rejectedDataCases))
  it(`212 datos: rechaza ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length).toBeGreaterThan(0);
  });
it("212 datos: composición real alcanza tablas en herramientas y auxiliares importadas", () => {
  const home = mkdtempSync(join(tmpdir(), "secret-data-"));
  try {
    mkdirSync(join(home, "src"));
    mkdirSync(join(home, "lib"));
    writeFileSync(join(home, "package.json"), JSON.stringify({ desert: { program: "src/main.ts" } }));
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
      "import { lista, tupla, texto, tabla, porId } from '../lib/data.ts';" +
        "export const tool = { acts: { run: () => [lista(), tupla(), texto(), tabla(), porId()] } };",
    );
    expect(programSecretBoundaries(home)).toEqual([]);
    writeFileSync(join(home, "lib/data.ts"), helpers + "\nconst objeto = {}; objeto.__proto__;");
    expect(programSecretBoundaries(home).some(item => item.includes("__proto__"))).toBe(true);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
