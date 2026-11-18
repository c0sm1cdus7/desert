// Reports every runtime composition problem with a stable reason and path before building any maps.
import { distributionTexts } from "../../texts/distributions.texts.ts";
import { DESERT_CONTRACT } from "../../tools/installable/program.ts";
import type { CompositionOptions } from "./validation-types.ts";
export type CompositionIssue = Readonly<{
  path: string;
  reason: keyof typeof distributionTexts.reasons;
}>;
export class CompositionError extends Error {
  readonly issues: readonly CompositionIssue[];
  constructor(issues: readonly CompositionIssue[]) {
    super(
      [
        distributionTexts.failed,
        ...issues.map(issue => `${issue.path}: ${distributionTexts.reasons[issue.reason]}`),
      ].join("\n"),
    );
    this.name = "CompositionError";
    this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue })));
  }
}
export function diagnostico(options: CompositionOptions): readonly CompositionIssue[] {
  const issues: CompositionIssue[] = [];
  const add = (path: string, reason: CompositionIssue["reason"]) => {
    issues.push({ path, reason });
  };
  const ids = new Set<string>();
  const facts = new Set<string>();
  for (const program of options.programas) {
    for (const dependency of program.dependencies ?? [])
      if (dependency.kind === "distribution")
        add(`${program.id}/dependencies/${dependency.name}`, "dependencia-distribucion");
    if (program.desert !== DESERT_CONTRACT) add(`${program.id}/desert`, "contrato-desert");
    if (ids.has(program.id)) add(`programas/${program.id}`, "id-repetido");
    if (!/^[a-z][a-z0-9.-]*$/.test(program.id) || ["identities", "preferences", "me"].includes(program.id))
      add(`programas/${program.id}`, "id-invalido");
    ids.add(program.id);
    for (const fact of program.hechos) {
      if (facts.has(fact.nombre)) add(`hechos/${fact.nombre}`, "hecho-repetido");
      facts.add(fact.nombre);
      if (!fact.nombre.startsWith(`${program.id}/`) || fact.nombre === `${program.id}/`)
        add(`${program.id}/hechos/${fact.nombre}`, "hecho-ajeno");
    }
    for (const [name, group] of Object.entries(program.herramientas)) {
      if (!/^[a-z][a-z0-9.-]*$/.test(name)) add(`${program.id}/herramientas/${name}`, "id-invalido");
      Object.keys(group.acts)
        .filter(action => !/^[a-z][a-z0-9.-]*$/.test(action))
        .forEach(action => add(`${program.id}/herramientas/${name}/acciones/${action}`, "id-invalido"));
      if (group.effects !== undefined) add(`${program.id}/herramientas/${name}/effects`, "reacciones-no-soportadas");
    }
    if (program.effects !== undefined) add(`${program.id}/effects`, "reacciones-no-soportadas");
  }
  const minds = new Set<string>();
  for (const id of options.mentes.programas) {
    if (!ids.has(id)) add(`mentes/programas/${id}`, "mente-ausente");
    if (minds.has(id)) add(`mentes/programas/${id}`, "mente-repetida");
    minds.add(id);
  }
  if (options.mentes.asistentes && !options.identidades) add("mentes/asistentes", "asistentes-requiere-identidades");
  return [...new Map(issues.map(issue => [`${issue.path}:${issue.reason}`, issue])).values()];
}
