// Reports every runtime composition problem with a stable reason and path before building any maps.
import { distributionContractIssues } from "./program-contracts.ts";
import { contractTexts } from "../../texts/contracts.texts.ts";
import { distributionTexts } from "../../texts/distributions.texts.ts";
import { DESERT_CONTRACT } from "../../tools/installable/program.ts";
import type { CompositionOptions } from "./validation-types.ts";
export type CompositionIssue = Readonly<{
  path: string;
  reason: string;
}>;
export class CompositionError extends Error {
  readonly issues: readonly CompositionIssue[];
  constructor(issues: readonly CompositionIssue[]) {
    super([distributionTexts.failed, ...issues.map(issueText)].join("\n"));
    this.name = "CompositionError";
    this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue })));
  }
}
type Add = (path: string, reason: CompositionIssue["reason"]) => void;
type Program = CompositionOptions["programas"][number];
const validId = (id: string) => /^[a-z][a-z0-9.-]*$/.test(id);
function programIssues(program: Program, ids: Set<string>, facts: Set<string>, add: Add): void {
  for (const dependency of program.dependencies ?? [])
    if (dependency.kind === "distribution")
      add(`${program.id}/dependencies/${dependency.name}`, "dependencia-distribucion");
  if (program.desert !== DESERT_CONTRACT) add(`${program.id}/desert`, "contrato-desert");
  if (ids.has(program.id)) add(`programas/${program.id}`, "id-repetido");
  // `supervisor` is reserved: its mind would be the house supervisor's actor, mind:supervisor.
  if (!validId(program.id) || ["identities", "preferences", "me", "supervisor"].includes(program.id))
    add(`programas/${program.id}`, "id-invalido");
  ids.add(program.id);
  for (const fact of program.hechos) {
    if (facts.has(fact.nombre)) add(`hechos/${fact.nombre}`, "hecho-repetido");
    facts.add(fact.nombre);
    if (!fact.nombre.startsWith(`${program.id}/`) || fact.nombre === `${program.id}/`)
      add(`${program.id}/hechos/${fact.nombre}`, "hecho-ajeno");
  }
  for (const [name, group] of Object.entries(program.herramientas)) {
    if (!validId(name)) add(`${program.id}/herramientas/${name}`, "id-invalido");
    Object.keys(group.acts)
      .filter(action => !validId(action))
      .forEach(action => add(`${program.id}/herramientas/${name}/acciones/${action}`, "id-invalido"));
    if (group.effects !== undefined) add(`${program.id}/herramientas/${name}/effects`, "reacciones-no-soportadas");
  }
  if (program.effects !== undefined) add(`${program.id}/effects`, "reacciones-no-soportadas");
}
export function diagnostico(options: CompositionOptions): readonly CompositionIssue[] {
  const issues: CompositionIssue[] = [];
  const add: Add = (path, reason) => {
    issues.push({ path, reason });
  };
  const ids = new Set<string>();
  const facts = new Set<string>();
  for (const program of options.programas) programIssues(program, ids, facts, add);
  const minds = new Set<string>();
  for (const id of options.mentes.programas) {
    if (!ids.has(id)) add(`mentes/programas/${id}`, "mente-ausente");
    if (minds.has(id)) add(`mentes/programas/${id}`, "mente-repetida");
    minds.add(id);
  }
  if (options.mentes.asistentes && !options.identidades) add("mentes/asistentes", "asistentes-requiere-identidades");
  issues.push(...distributionContractIssues(options.programas, options.contratos));
  return [...new Map(issues.map(issue => [`${issue.path}:${issue.reason}`, issue])).values()];
}

function issueText(issue: CompositionIssue): string {
  const message =
    Object.entries(distributionTexts.reasons).find(([reason]) => reason === issue.reason)?.[1] ??
    `${contractTexts.invalidComposition} (${issue.reason})`;
  return `${issue.path}: ${message}`;
}
