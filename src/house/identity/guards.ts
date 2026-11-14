import type { Emission, Event, Foreign, HouseEmission } from "../../journal/events.ts";
import type { Creation } from "../house.ts";
import { identityNameProblem } from "../identity-name.ts";

export class InvalidCreation extends Error {}
export function checkCreation(creation: Creation, by: string): void {
  const problem = [creation.admin, ...creation.assignments.map(assignment => assignment.identity)]
    .map(identity => identityNameProblem(identity, by))
    .find(Boolean);
  if (problem) throw new InvalidCreation(problem);
}
function identityIn(emission: HouseEmission): string | undefined {
  if (emission.kind === "house-created") return emission.by;
  if (emission.kind === "granted") return emission.data.identity;
  if (emission.kind === "handed") return emission.data.to;
  return undefined;
}
export function checkIdentity<P extends Foreign>(emission: Emission<P>, runner: string): Emission<P> {
  const identity = emission.layer === "house" ? identityIn(emission) : undefined;
  const problem = identity === undefined ? undefined : identityNameProblem(identity, runner);
  if (problem) throw new Error(problem);
  return emission;
}

export function guardJournal<P extends Foreign>(
  journal: { append(emission: Emission<P>, at: number): Event<P> },
  runner: string,
): void {
  const append = journal.append.bind(journal);
  journal.append = (emission, at) => append(checkIdentity(emission, runner), at);
}
