// A program says every word it declares in every language: a word left in one language fails its gate.
import { deepStrictEqual } from "node:assert/strict";
import { isRecord, list } from "../../../fields/json-values.ts";
import { isPhrase } from "../../../fields/phrases.ts";
import type { Shown, ToolWords } from "../../../surface/bridge/ports/house-ports.ts";
import { promiseTexts as said } from "../../../texts/promises.texts.ts";
import type { Case, Composition, ProgramAct, ProgramTool } from "../../../tools/promises.ts";
import type { Program } from "../../../tools/tool-contract.ts";
import type { Check } from "../promised-stage.ts";
/** A declared word and where it is declared. */
type Declared = readonly [where: string, text: unknown];
const entries = (where: string, record: unknown): Declared[] =>
  isRecord(record) ? Object.entries(record).map(([key, text]) => [`${where}.${key}`, text] as const) : [];
/** The questions of an act's input: every field asks under `said`, at any depth. */
const asked = (where: string, schema: unknown): Declared[] => {
  if (!isRecord(schema)) return [];
  /** A field asks under `said` in every language; a title alone is asked in one. */
  const question = "said" in schema ? schema.said : schema.title;
  const own: Declared[] = question === undefined ? [] : [[`${where}.said`, question]];
  const fields = Object.entries(isRecord(schema.properties) ? schema.properties : {});
  return [
    ...own,
    ...fields.flatMap(([key, field]) => asked(`${where}.${key}`, field)),
    ...list(schema.anyOf).flatMap((arm, index) => asked(`${where}|${index}`, arm)),
    ...asked(`${where}[]`, schema.items),
  ];
};
/** What a tool's words say on a surface: its name, its lists and the stacks and labels of what it reads. */
function shownWords(where: string, words: ToolWords | undefined): Declared[] {
  if (!words) return [];
  const stacks = [...("itself" in words ? words.itself : []), ...("presents" in words ? words.presents : [])];
  return [
    [`${where}.name`, words.name],
    ...("listed" in words
      ? [[`${where}.empty`, words.empty] as const, [`${where}.listed`, words.listed] as const]
      : []),
    ...entries(`${where}.reads`, "reads" in words ? words.reads : {}),
    ...stacks.flatMap((stack, index) => [
      [`${where}.stack${index}.title`, stack.title] as const,
      [`${where}.stack${index}.empty`, stack.empty] as const,
      ...entries(`${where}.stack${index}.reads`, stack.reads),
    ]),
  ];
}
/** What a case promises the act says, refuses with, puts before the person, or says something needs. */
function caseWords<X extends Program>(where: string, kase: Case<X>): Declared[] {
  const then = kase.then;
  if ("refused" in then) return [[`${where}.refused`, then.refused]];
  return [
    [`${where}.says`, then.says],
    ...(then.sure === undefined ? [] : [[`${where}.sure`, then.sure] as const]),
    ...[...(then.needs ?? []), ...Object.values(then.needsIn ?? {}).flat()].map(
      (need, index) => [`${where}.needs${index}`, need.why] as const,
    ),
  ];
}
function actWords<X extends Program>(where: string, act: ProgramAct<X>): Declared[] {
  return [
    [`${where}.name`, act.name],
    [`${where}.enter`, act.enter],
    [`${where}.purpose`, act.purpose],
    ...(act.title === undefined ? [] : [[`${where}.title`, act.title] as const]),
    ...act.refuses.map((cause, index) => [`${where}.refuses${index}`, cause] as const),
    ...asked(`${where}.input`, act.input),
    ...act.cases.flatMap((kase, index) => caseWords(`${where}.case${index}`, kase)),
  ];
}
/** Every word a tool declares, with where it is declared. */
export function declaredWords<X extends Program>(tool: ProgramTool<X>, shown: Shown<X>): Declared[] {
  return [
    [`${tool.id}.purpose`, tool.purpose],
    ...(tool.name === undefined ? [] : [[`${tool.id}.name`, tool.name] as const]),
    ...shownWords(`${tool.id}.words`, shown.words[tool.id]),
    ...Object.entries(tool.menus ?? {}).flatMap(([key, menu]) => [
      [`${tool.id}.menus.${key}.name`, menu.name] as const,
      [`${tool.id}.menus.${key}.purpose`, menu.purpose] as const,
    ]),
    ...Object.entries(tool.acts).flatMap(([name, act]) => actWords(`${tool.id}.${name}`, act)),
  ];
}
/** Each tool says every word it declares in every language: the check names each word that is said in one. */
export function languageChecks<X extends Program>(program: Composition<X>, shown: Shown<X>): readonly Check[] {
  return program.registry.map(tool => ({
    name: `${tool.id} · ${said.everyLanguage}`,
    run: () => {
      const missing = declaredWords(tool, shown).filter(([, text]) => !isPhrase(text));
      deepStrictEqual(
        missing.map(([where]) => where),
        [],
        said.oneLanguage(tool.id),
      );
      return Promise.resolve();
    },
  }));
}
