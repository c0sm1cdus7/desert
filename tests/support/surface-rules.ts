// Rules as a surface tool, for the specs that walk a renderer.
import { type Result, type ThingAct, type Tool, type ToolAct } from "../../src/surface/contract.ts";

export interface Rule {
  readonly id: string;
  readonly text: string;
  readonly since: string;
  readonly mine: boolean;
}
const ask = "¿Qué regla tiene que seguir Nora?";
const dropRule = (rules: Rule[], target: string): void => {
  const at = rules.findIndex(rule => rule.id === target);
  rules.splice(at, 1);
};
const createAct = (rules: Rule[], done: (text: string) => Promise<Result>): ToolAct => ({
  label: "nueva regla",
  verb: "crear",
  key: "n",
  hint: "una regla tuya para Nora",
  scope: "all",
  next: answers => (answers.length ? null : { ask, kind: "text", placeholder: "Escribí la regla…" }),
  run: async ([text]) => {
    const result = await done("La regla ya rige.");
    if (result.ok) rules.push({ id: "new", text: text ?? "", since: "06/11", mine: true });
    return result;
  },
});
const dropAct = (rules: Rule[], done: (text: string) => Promise<Result>): ThingAct => ({
  label: "eliminar",
  verb: "eliminar",
  key: "l",
  hint: "deja de regir · no se puede deshacer",
  scope: "each",
  leaves: true,
  title: () => "Eliminar regla",
  available: target => rules.some(rule => rule.id === target),
  next: (answers, target) =>
    answers.length
      ? null
      : {
          ask: `¿Eliminar «${rules.find(rule => rule.id === target)?.text ?? ""}»? No se puede deshacer.`,
          kind: "confirm",
          options: [{ key: "e", title: "eliminar", detail: "la borra ahora" }],
        },
  run: async (_answers, target) => {
    const result = await done("La regla ya no rige.");
    if (result.ok) dropRule(rules, target);
    return result;
  },
});
export function rulesTool(rules: Rule[], fail?: string): Tool {
  const done = (text: string): Promise<Result> =>
    Promise.resolve(fail ? { ok: false, reason: fail } : { ok: true, text });
  return {
    id: "rules",
    name: "Reglas",
    place: { key: "r", section: "tools" },
    summary: () =>
      `${rules.filter(rule => rule.mine).length} tuyas · ${rules.filter(rule => !rule.mine).length} de Nora`,
    titleOf: () => "Regla",
    view: target => {
      if (target !== undefined) {
        const rule = rules.find(known => known.id === target);
        if (!rule) throw new Error(`rules has no ${target}`);
        return [{ title: "Regla", rows: [{ title: rule.text }] }];
      }
      const rowOf = (known: Rule) => ({ title: known.text, detail: `desde el ${known.since}`, opens: known.id });
      return [
        { title: "Tuyas", empty: "No hay reglas.", rows: rules.filter(known => known.mine).map(rowOf) },
        { title: "De Nora", rows: rules.filter(known => !known.mine).map(rowOf) },
      ];
    },
    acts: { create: createAct(rules, done) },
    actsOn: { drop: dropAct(rules, done) },
  };
}
export const seed = (): Rule[] => [
  { id: "a", text: "Responder siempre en español", since: "02/11", mine: true },
  { id: "b", text: "No inventar títulos ni direcciones", since: "01/11", mine: false },
];
