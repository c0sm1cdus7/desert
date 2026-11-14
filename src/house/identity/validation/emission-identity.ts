import type { Emission, Foreign, HouseEmission } from "../../../journal/events.ts";
import { identityNameProblem } from "../../identity-name.ts";
import { identityTexts } from "../../../texts/identities/identities.texts.ts";
function identityIn(emission: HouseEmission): string | undefined {
  if (emission.kind === "house-created") return emission.by;
  if (emission.kind === "granted") return emission.data.identity;
  if (emission.kind === "handed") return emission.data.to;
  return undefined;
}
export function checkIdentity<P extends Foreign>(emission: Emission<P>, runner: string): Emission<P> {
  if (
    emission.layer === "house" &&
    ((emission.kind === "granted" && emission.data.tools.includes("identities")) ||
      (emission.kind === "kit-set" && emission.data.tool === "identities"))
  )
    throw new Error(identityTexts.reserved);
  const identity = emission.layer === "house" ? identityIn(emission) : undefined;
  const problem = identity === undefined ? undefined : identityNameProblem(identity, runner);
  if (problem) throw new Error(problem);
  return emission;
}
