// Public rule for new identifiers, without altering the historical fold.
import { type Text } from "../../fields/phrases.ts";
import { identityNameTexts } from "../../texts/tools.texts.ts";
/** The identifier of a new identity; historical facts are folded without this check. */
export function identityNameProblem(name: string, runner: string): Text | undefined {
  return name === runner || !/^[a-z][a-z0-9.-]{0,63}$/.test(name) ? identityNameTexts.rule : undefined;
}
