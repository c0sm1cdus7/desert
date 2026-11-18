// Each production file names its purpose; folders group concerns rather than enforce a line budget.
import { readFileSync } from "node:fs";
import { basename, join, posix, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { lawRepository } from "../support/law-repository.ts";
import { filesUnder, isSpec, src } from "../support/sources.ts";
import { tree } from "./tree.ts";
const files = filesUnder(src);
const production = files.filter(file => !isSpec(file));
const nameOf = (file: string): string => relative(src, file).split(sep).join("/");
const lines = (file: string): number => readFileSync(file, "utf8").replace(/\n$/, "").split("\n").length;
const withoutPurpose = (folder: string): string[] =>
  filesUnder(folder)
    .filter(file => !isSpec(file))
    .filter(file => !/^\/\/ \S[^\r\n]*$/u.test(readFileSync(file, "utf8").split(/\r?\n/u)[0] ?? ""))
    .map(file => relative(folder, file).split(sep).join("/"));
describe("the tree of src/", () => {
  it("admits exactly the planned production files, each with a one-line purpose", () => {
    expect(production.map(nameOf).sort()).toEqual(Object.keys(tree).sort());
    const vague = Object.entries(tree).filter(([, purpose]) => purpose.trim() === "" || purpose.includes("\n"));
    expect(vague.map(([name]) => name)).toEqual([]);
  });
  it("starts every production file with a one-line purpose comment", () => {
    expect(withoutPurpose(src)).toEqual([]);
  });
  it("catches missing, misplaced and empty headers in planted production files", () => {
    const repo = lawRepository({
      "src/blank.ts": "\n// Declares the entry point.\nexport {};\n",
      "src/block.ts": "/** Declares the entry point. */\nexport {};\n",
      "src/crlf.ts": "// Declares the entry point.\r\nexport {};\r\n",
      "src/empty.ts": "",
      "src/indented.ts": " // Declares the entry point.\nexport {};\n",
      "src/joined.ts": "//Declares the entry point.\nexport {};\n",
      "src/missing.spec.ts": "export {};\n",
      "src/nested/after-import.ts": 'import "../a.ts";\n// Declares the entry point.\nexport {};\n',
      "src/purpose.ts": "// Declares the entry point.\nexport {};\n",
      "src/spaces.ts": "// \t \nexport {};\n",
      "src/vacant.ts": "// \nexport {};\n",
    });
    expect(withoutPurpose(join(repo.root, "src")).sort()).toEqual([
      "a.ts",
      "blank.ts",
      "block.ts",
      "empty.ts",
      "indented.ts",
      "joined.ts",
      "nested/after-import.ts",
      "spaces.ts",
      "vacant.ts",
    ]);
  });
  it("groups at least two production files per folder, except the package root awaiting index.ts", () => {
    const folders = new Map<string, string[]>();
    for (const file of production) {
      const folder = posix.dirname(nameOf(file));
      folders.set(folder, [...(folders.get(folder) ?? []), nameOf(file)]);
    }
    const indexed = production.some(file => nameOf(file) === "index.ts");
    expect([...folders].filter(([folder, files]) => (folder !== "." || indexed) && files.length === 1)).toEqual([]);
  });
  // The signed move changes file size, but preserves the complete 519-line text budget.
  // 518 since the first step; 519 after union 1. Reorder: +14, addressing.ts (code that reads texts) lives in texts/.
  // Cleanup 1: +2 lines for texts/capital.ts, the shared initial-capital definition and its purpose.
  // Cleanup 5: +7 purpose headers in capital, identity-name, journal, secrets, socket, surface and tools.
  // Moving the existing headers in generic-surface and promises adds no lines; the per-file limit stays 300.
  // MCP: +21 lines for its four fixed tools, orientation and protocol errors in the catalog.
  // MCP with a real client: +1 line telling the agent that amounts travel in cents.
  // Nube 1: +7 exact lines for cloud.texts.ts, three environment-key diagnostics and their purpose.
  // MCP budget: +1 line for the refusal of a wait past the per-identity bound.
  // Mente 1: +14 exact lines for the typed Identidades skill message and its Spanish translation.
  // Modelos: +14 líneas exactas para explicar errores del catálogo y el proveedor.
  // Mente 3: +10 líneas exactas para el mensaje parametrizado de rechazo de contratos de mente.
  // Mente 4A: +86 líneas exactas para mensajes de asistentes, adopción, delegación y autoría.
  // Marco: +26 líneas exactas para instrucciones y rótulos del marco.
  // Mente 2C: +78 líneas exactas para cierres, correcciones, consulta y revisión del turno.
  // Mente 2D: +29 líneas exactas para el mensaje de propósitos de los seis controles de journey.
  // Mente 2E: +57 líneas exactas para diagnósticos y asignación de cartas y gasto.
  // Unión de la etapa 2: +12 líneas exactas para la capa de la casa del marco (cómo leer, contestar y consultar).
  // Distribuciones paso 1: +17 líneas exactas para diagnósticos de composición y rótulos de carpetas.
  // Reacciones: +3 líneas exactas para declaración inválida, pendiente visible y migración de effects.
  // Dist-kit: +9 líneas exactas para carpetas, herencia, retiradas y explicación de administración.
  // Contratos: +10 líneas exactas para diagnósticos de valores, composición y casos ejecutados.
  it("keeps every file within 300 lines and the texts within 937", () => {
    expect(files.filter(file => lines(file) > 300).map(nameOf)).toEqual([]);
    const texts = production.filter(file => nameOf(file).startsWith("texts/"));
    expect(texts.reduce((total, file) => total + lines(file), 0)).toBeLessThanOrEqual(937);
  });
  it("gives each production concern a unique filename, including text declarations", () => {
    const names = production.map(file => basename(file, ".ts"));
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });
});
