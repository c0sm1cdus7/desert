// Small adopting programs exercise catalog laws through the same public entry as real program gates.
import { lawPackage, lawOptions, lawRepository } from "./law-repository.ts";
export function catalogProgram(files: Readonly<Record<string, string>> = {}) {
  return lawRepository({
    "package.json": JSON.stringify({
      ...lawPackage,
      exports: { ".": "./src/a.ts" },
      desert: { ...lawPackage.desert, laws: { ...lawOptions, catalog: ["src/texts/"] } },
    }),
    "src/model.ts": `import {vocabulary as journal} from 'desert/journal';
export const facts = journal({'notes/added': {}});`,
    "src/action.ts": `import {programAct as action} from 'desert/programa';
import {facts} from './model.ts';
export const add = action({run: () => ({effects: [facts.fact('notes/added', {}, 'ana')]})});`,
    "src/a.ts": `import {add as write} from './action.ts';
export const program = {herramientas: {notes: {acts: {write}}}};`,
    "src/texts/words.ts": "export const limit = 20;",
    ...files,
  });
}
