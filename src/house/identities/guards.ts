// Comprueba identificadores nuevos antes de crear o escribir, sin tocar la historia.
import { rulesTexts } from "../../texts/rules.texts.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import { checkIdentity } from "./emission-identity.ts";
import type { Emission, Event, Foreign } from "../../journal/vocabulary.ts";
import type { Creation } from "../members.ts";
import { identityNameProblem } from "./identity-name.ts";
export { checkIdentity } from "./emission-identity.ts";

export class InvalidCreation extends Error {}
export function checkCreation(creation: Creation, by: string): void {
  if (creation.assignments.some(({ tools }) => tools.includes("identities")))
    throw new InvalidCreation(identityTexts.reserved);
  if (creation.assignments.some(({ tools }) => tools.includes("rules"))) throw new InvalidCreation(rulesTexts.reserved);
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
