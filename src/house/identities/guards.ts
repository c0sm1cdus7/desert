// Checks new identifiers before creating or writing, without touching history.
import { meant } from "../../fields/phrases.ts";
import type { Emission, Event, Foreign } from "../../journal/vocabulary.ts";
import type { Creation } from "../members.ts";
import { coreToolReasons } from "../system-tools.ts";
import { checkIdentity } from "./emission-identity.ts";
import { isLanguage } from "../../fields/languages.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
import { identityNameProblem } from "./identity-name.ts";
export { checkIdentity } from "./emission-identity.ts";

export class InvalidCreation extends Error {}
/** A journal from before identities had a language: it opens once the stored-name migration gave them one. */
export class UnmigratedJournal extends Error {}
export function checkCreation(creation: Creation, by: string): void {
  for (const [tool, reason] of Object.entries(coreToolReasons))
    if (creation.assignments.some(({ tools }) => tools.includes(tool))) throw new InvalidCreation(meant(reason));
  const problem = [creation.admin, ...creation.assignments.map(assignment => assignment.identity)]
    .map(identity => identityNameProblem(identity, by))
    .find(Boolean);
  if (problem) throw new InvalidCreation(meant(problem));
  const said = [{ identity: creation.admin, language: creation.language }, ...creation.assignments];
  const twice = said.find(({ identity, language }) =>
    said.some(other => other.identity === identity && other.language !== language),
  );
  if (twice) throw new InvalidCreation(meant(identityTexts.twoLanguages(twice.identity)));
  const unsaid = said.find(({ language }) => !isLanguage(language));
  if (unsaid) throw new InvalidCreation(meant(identityTexts.noLanguage(unsaid.identity)));
}

export function guardJournal<P extends Foreign>(
  journal: { append(emission: Emission<P>, at: number): Event<P> },
  runner: string,
): void {
  const append = journal.append.bind(journal);
  journal.append = (emission, at) => append(checkIdentity(emission, runner), at);
}
