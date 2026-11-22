// Real program shapes distinguish catalog consumers from test-only evidence and unrelated technical data.
import { expect, it } from "vitest";
import { programLaws } from "../../src/laws.ts";
import { catalogProgram } from "../support/program-catalog-fixture.ts";

it("counts an imported, aliased journal factory in a registered action", async () => {
  expect(await programLaws(catalogProgram().root)).toEqual([]);
});
it("follows a helper and an aliased vocabulary receiver from an action run", async () => {
  const repo = catalogProgram({
    "src/helper.ts": `import {facts as original} from './model.ts';
const journal = original;
export function emit() { return journal.fact('notes/added', {}, 'ana'); }`,
    "src/action.ts": `import {programAct} from 'desert/program';
import {emit} from './helper.ts';
export const add = programAct({run: () => ({effects: [emit()]})});`,
  });
  expect(await programLaws(repo.root)).toEqual([]);
});
it("recognizes namespace journal imports without loading dependencies", async () => {
  const repo = catalogProgram({
    "src/model.ts": `import * as journal from 'desert/journal';
export const facts = journal.vocabulary({'notes/added': {}});`,
  });
  expect(await programLaws(repo.root)).toEqual([]);
});
it("keeps core context facts outside the program's fact obligations", async () => {
  const repo = catalogProgram({
    "src/contexts.ts": `export const given = [
{layer: 'house', kind: 'granted', data: {}, by: 'bank', cause: []},
{layer: 'house', kind: 'named', data: {}, by: 'bank', cause: []}];`,
    "src/a.ts": `import {add} from './action.ts'; import {given} from './contexts.ts';
export const program = {acts: {add}, mindCases: [{given}]};`,
  });
  expect(await programLaws(repo.root)).toEqual([]);
});
it("does not mistake formatter options, numbers, limits or numeric functions for catalog texts", async () => {
  const repo = catalogProgram({
    "src/texts/words.ts": `export const limit = 20;
export const limits = {message: 4000};
export const count = () => 42;
const clock = new Intl.DateTimeFormat('es-AR', {
day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
export const moment = (at: number): string => clock.format(at);`,
    "src/a.ts": `import {add} from './action.ts'; import {moment} from './texts/words.ts';
export const program = {acts: {add}, summary: moment};`,
  });
  expect(await programLaws(repo.root)).toEqual([]);
});
it("counts array samples, mapped participants, returned texts, skills and mind declarations as consumers", async () => {
  const repo = catalogProgram({
    "src/texts/words.ts": `export const words = {
samples: [{name: 'Ana', note: {title: 'Mate', text: 'Mañana tomamos mate'}}],
participants: [{identity: 'ana'}],
stored: (n: number) => ({title: 'Mate', text: String(n)}),
blocked: (n: number) => {return {title: 'Mate', text: String(n)};},
skill: 'Ayudá con las notas', mind: 'Explicá la nota completa',
};`,
    "src/cases.ts": `import {words} from './texts/words.ts';
export const cases = words.samples.map(sample => ({given: sample.note, name: sample.name}));
export const participants = words.participants.map(item => ({...item}));
export const stored = [words.stored(1), words.blocked(2)];`,
    "src/a.ts": `import {add} from './action.ts'; import {words} from './texts/words.ts';
import {cases, participants, stored} from './cases.ts';
export const program = {acts: {add}, mindCases: cases, skill: words.skill,
mind: words.mind, participants, stored};`,
  });
  expect(await programLaws(repo.root)).toEqual([]);
});
it.each([
  ["declared but absent", "export const add = {};"],
  [
    "only in action cases",
    `import {programAct} from 'desert/program'; import {facts} from './model.ts';
export const add = programAct({run: () => ({}), cases: [{given: [facts.fact('notes/added', {}, 'ana')]}]});`,
  ],
  [
    "only in a mind context",
    `import {facts} from './model.ts';
export const add = {}; export const mindCases = [{given: [facts.fact('notes/added', {}, 'ana')]}];`,
  ],
  [
    "unrelated ledger method",
    `const audit = {fact: (kind: string) => ({kind})};
export const add = {run: () => audit.fact('notes/added')};`,
  ],
])("rejects a program fact %s", async (_pattern, action) => {
  const repo = catalogProgram({ "src/action.ts": action });
  const failures = await programLaws(repo.root);
  expect(failures).toEqual([expect.stringContaining("E-L6-FACT · hecho sin acción registrada · notes/added")]);
});
it("keeps an unused or test-only catalog text red beside a used text", async () => {
  const repo = catalogProgram({
    "src/texts/words.ts": "export const words = {used: 'Mate', unused: 'Café', tested: 'Té'};",
    "src/a.ts": `import {add} from './action.ts'; import {words} from './texts/words.ts';
export const program = {acts: {add}, name: words.used};`,
    "src/words.spec.ts": "import {words} from './texts/words.ts'; export const check = words.tested;",
  });
  expect(await programLaws(repo.root)).toEqual([
    expect.stringContaining("E-L6-TEXT · texto sin uso · unused"),
    expect.stringContaining("E-L6-TEXT · texto sin uso · tested"),
  ]);
});
it("keeps a test-only export red while accepting a helper used by the program's mind", async () => {
  const repo = catalogProgram({
    "src/helpers.ts": "export const tested = () => 1; export const mind = () => 2;",
    "src/helpers.spec.ts": "import {tested} from './helpers.ts'; export const check = tested();",
    "src/a.ts": `import {add} from './action.ts'; import {mind} from './helpers.ts';
export const program = {acts: {add}, mindCases: [{check: mind}]};`,
  });
  expect(await programLaws(repo.root)).toEqual([
    expect.stringContaining("E-L6-EXPORT · exportado usado sólo por pruebas · tested"),
  ]);
});

it.each(["() => ({effects: [facts.fact('notes/added', {}, 'ana')]})", "write"])(
  "recognizes ownAct's positional execution callback (%s)",
  async callback => {
    const repo = catalogProgram({
      "src/factory.ts": `export const ownAct = (target, name, metadata, run) => ({...metadata, run});`,
      "src/action.ts": `import {ownAct} from './factory.ts'; import {facts} from './model.ts';
function write() {return {effects: [facts.fact('notes/added', {}, 'ana')]};}
export const add = ownAct('notes', 'add', {}, ${callback});`,
    });
    expect(await programLaws(repo.root)).toEqual([]);
  },
);
it("recognizes a registered action's method-form run", async () => {
  const repo = catalogProgram({
    "src/action.ts": `import {programAct} from 'desert/program'; import {facts} from './model.ts';
export const add = programAct({run() {return {effects: [facts.fact('notes/added', {}, 'ana')]};}});`,
  });
  expect(await programLaws(repo.root)).toEqual([]);
});
