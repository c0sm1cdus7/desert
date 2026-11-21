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
  // Distribuciones paso 2: +2 líneas exactas para rechazar dependencias de distribuciones y señalar su ruta.
  // Contratos: +10 líneas exactas para diagnósticos de valores, composición y casos ejecutados.
  // MCP por programa: +12 líneas exactas para explicar objetivos de carpetas y objetos y acciones ajenas apagadas.
  // Dist-palabras: +14 líneas exactas para contar niveles y nombrar la confirmación de carpetas y su titular.
  // Reentrega: +3 líneas exactas para decir por qué no se guardó (o se cortó) el registro de aperturas.
  // Dist-v10: +2 líneas exactas para exigir la composición local de prueba sin atar el programa a una distro.
  // Dist-mentes-programa: +22 líneas exactas para reglas comunes, palabras del programa y aviso de indisponibilidad.
  // Mente de programa: +1 línea para decir que la atención la marca el código (decisión 28).
  // Core Reglas: +128 líneas exactas para acciones, condiciones, simulación y esperas sin supervisor.
  // Devices add 16 lines to Rules' 128: the shared baseline is 993, so the combined budget is 1137.
  // Mente-error: +12 líneas para la causa HTTP en escena y stdout; +1 neta para fallas de lectura del cuerpo.
  // RT-VO3: +3 líneas para explicar la raíz de confianza y +5 para comprobar SQLite entre fases de reserva.
  // MCP MI-2: +2 líneas para distinguir selección por program/target y restricciones del kit en reason.
  // 20/11: +1 for the correction a mind gets when its wait ends before now.
  // 20/11 Asistentes y supervisor: +74 exact lines. +14 for the assistant's own rules (who it is, whose, talking
  // only through the talk programs, journeys with its delegated kit, naming a mind to wake it, no invented
  // permissions); +60 for supervisor.texts.ts: its house layer (with the rules that ask for its judgment), its
  // rules, frame labels and review notices.
  // 21/11 Journeys by facts: +55 exact lines. +21 in journey.texts.ts (resume's purpose, a cut turn and why a journey
  // woke, in words); +32 in mind-turn.texts.ts (the stop list the closing fact reads, the conversation that outgrew the
  // request, the continuation correction and the results a journey hears between calls); +2 for the frame saying a
  // journey goes on.
  // 21/11 Supervisor nuevo: +50 exact (journey 17, supervisor 26, rules 6, mind-turn 1): stops, verdicts, its turns.
  // 21/11 review: +2 in rules.texts.ts, why a marked act got no verdict: its supervisor is starting, or a reaction.
  // 21/11 Device notices: +3 exact lines in devices.texts.ts (a house older than the device, a refused notice, one
  // that travels without its value). +1 exact line in devices.texts.ts: a tool's invalid notice, by tool and execution.
  // 21/11 step C: +23 in journey.texts.ts and mind-turn.texts.ts: a notice's wake line and two wait-on-notice refusals.
  // 21/11 review: +9 exact in journey.texts.ts: one line counting the cut journeys that do not fit beside a scene.
  // 21/11 plan refusals: +22 exact in journey.texts.ts: what a journey hears when it gets its own plan wrong.
  it("keeps every file within 300 lines and the texts within 1403", () => {
    expect(files.filter(file => lines(file) > 300).map(nameOf)).toEqual([]);
    const texts = production.filter(file => nameOf(file).startsWith("texts/"));
    expect(texts.reduce((total, file) => total + lines(file), 0)).toBeLessThanOrEqual(1403);
  });
  it("gives each production concern a unique filename, including text declarations", () => {
    const names = production.map(file => basename(file, ".ts"));
    expect(names.filter((name, index) => names.indexOf(name) !== index)).toEqual([]);
  });
});
