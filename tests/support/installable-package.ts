// A standalone version of the linked toy program, with its own test distribution and unmodified base laws.
import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { lawRepository, lawPackage, lawOptions } from "./law-repository.ts";
import { root } from "./sources.ts";
const toyFiles = {
  "src/a.ts": "export {};",
  "src/texts.ts": `// Names the toy's action and its result.
import { defineMessage } from "desert/messages";
import { Type } from "desert/programa";
export const words = { name: "Juguete", key: "j", itself: [] };
export const actionWords = { name: "anotar", enter: "anotar", key: "a", purpose: "guardar una nota" };
export const saved = "Anotada · Nota";
export const promise = "Anota una vez";
export const skill = defineMessage({ id: "toy.skill", kind: "skill", parameters: Type.Object({}),
  texts: { es: "Anotá con las acciones del programa." } });
`,
  "src/metadata.ts": `// Declares the toy's state and facts.
export const metadata = { id: "toy", version: "1.0.0", desert: 1,
  hechos: [], inicial: () => 0 } as const;
`,
  "src/notes.ts": `// Declares the toy's single tool without composition privileges.
import { programAct, Type, type LocalProgram } from "desert/programa";
import { words, actionWords, saved, promise } from "./texts.ts";
import { metadata } from "./metadata.ts";
const input = Type.Object({});
const add = programAct<LocalProgram<typeof metadata & { codigo: readonly [string] }>, typeof input>({
  ...actionWords, on: "tool", undoable: true, input,
  run: () => ({ status: "accepted", text: saved, effects: [] }),
  cases: [{ promise, input: {}, then: { says: saved, facts: [] } }] });
export const notes = { purpose: actionWords.purpose, palabras: words, acts: { add }, targets: () => [],
  view: () => "", summary: () => words.name };
`,
  "src/program.ts": `// Declares the toy independently of its test distribution.
import { programa } from "desert/programa";
import { words, actionWords, skill } from "./texts.ts";
import { metadata } from "./metadata.ts";
import { notes } from "./notes.ts";
export const program = programa({ ...metadata, codigo: [import.meta.dirname] }, {
  purpose: actionWords.purpose, palabras: words, skill,
  herramientas: { notes }, plegar: own => own, summary: () => words.name });
`,
};
export function installablePackage(shortcut = false) {
  const repo = lawRepository(packageFiles(shortcut));
  symlinkSync(root, join(repo.root, "desert"), "dir");
  mkdirSync(join(repo.root, "node_modules"));
  symlinkSync(root, join(repo.root, "node_modules/desert"), "dir");
  return repo;
}
function packageFiles(shortcut: boolean) {
  return {
    "package.json": JSON.stringify({
      ...lawPackage,
      name: "toy",
      exports: "./src/program.ts",
      peerDependencies: { desert: "0.1.0" },
      desert: {
        program: "src/program.ts",
        testDistribution: "tests/distribution.ts",
        laws: { ...lawOptions, base: "desert", catalog: ["src/texts.ts"] },
      },
    }),
    ...toyFiles,
    "tests/distribution.ts": `// Composes the toy for the base's complete derived gate.
import { componer } from "desert/componer";
import { program as toy } from "../src/program.ts";
export const { program, shown, manifest } = componer({ programas: [toy], identidades: false,
  atajoUnaHerramienta: ${shortcut},
  mentes: { asistentes: false, programas: [] }, presentacion: { codigo: [import.meta.filename],
    locale: { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" } } });
`,
    "vitest.config.ts":
      "export default { test: { projects: [\n" +
      '{ test: { include: ["src/**/*.spec.ts", "desert/tests/program/**/*.checks.ts"] } },\n' +
      '{ test: { include: ["tests/laws/**/*.spec.ts"] } } ] } };',
  };
}
