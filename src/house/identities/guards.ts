// Comprueba identificadores nuevos antes de crear o escribir, sin tocar la historia.
import type { Emission, Event, Foreign } from "../../journal/vocabulary.ts";
import type { Creation } from "../members.ts";
import { coreToolReasons } from "../system-tools.ts";
import { checkIdentity } from "./emission-identity.ts";
import { identityNameProblem } from "./identity-name.ts";
export { checkIdentity } from "./emission-identity.ts";

export class InvalidCreation extends Error {}
export function checkCreation(creation: Creation, by: string): void {
  for (const [tool, reason] of Object.entries(coreToolReasons))
    if (creation.assignments.some(({ tools }) => tools.includes(tool))) throw new InvalidCreation(reason);
  const problem = [creation.admin, ...creation.assignments.map(assignment => assignment.identity)]
    .map(identity => identityNameProblem(identity, by))
    .find(Boolean);
  if (problem) throw new InvalidCreation(problem);
}

export function guardJournal<P extends Foreign>(
  journal: { append(emission: Emission<P>, at: number): Event<P> },
  runner: string,
): void {
  const append = journal.append.bind(journal);
  journal.append = (emission, at) => append(checkIdentity(emission, runner), at);
}
