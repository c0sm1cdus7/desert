// Every law of the interface and of the programs with what makes it hold, or its name on the list of debts.
import manifest from "./rules.json" with { type: "json" };

export const guarantees = ["type", "compose", "derived", "surface", "spec", "debt"] as const;
export type Rule = Readonly<{ id: number; rule: string; from: string; guarantee: string }> &
  Readonly<{ evidence?: readonly string[]; debt?: string }>;
export const rules: readonly Rule[] = manifest.rules;
/** How many laws nothing makes hold yet: written down, so the list only grows or shrinks on purpose. */
export const debts: number = manifest.debts;
const named: Readonly<Record<string, string>> = {
  type: "no compila",
  compose: "el programa no arranca",
  derived: "prueba derivada de los casos",
  surface: "la cumple la superficie",
  spec: "una spec a mano",
  debt: "DEUDA",
};
const cell = (text: string): string => text.replaceAll("|", "\\|");
const row = ({ id, rule, from, guarantee, evidence = [], debt = "" }: Rule): string => {
  const where = guarantee === "debt" ? debt : evidence.map(file => `\`${file}\``).join(" ");
  return `| ${id} | ${cell(rule)} | ${from} | ${named[guarantee] ?? guarantee} | ${cell(where)} |`;
};
/** The list as a person reads it: GARANTIAS.md is this text and nothing else. */
export function rulesText(): string {
  return [
    "# Qué hace cumplir cada ley",
    "",
    "Sale de `tests/laws/rules.json`. No se edita a mano: `pnpm rules` lo escribe y el gate falla si quedó viejo.",
    "Una ley que nada hace cumplir figura como DEUDA, con cómo se salda. Sumar o saldar una cambia el número de abajo.",
    "",
    `Leyes: ${rules.length}. Deudas: ${debts}.`,
    "",
    "| # | Ley | De dónde | Garantía | Dónde, o cómo se salda |",
    "|---|---|---|---|---|",
    ...rules.map(row),
    "",
  ].join("\n");
}
