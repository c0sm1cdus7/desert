// Valida identificadores nuevos y rechaza asignaciones o recortes del id reservado identities antes de escribir.
import type { Emission, Foreign } from "../../journal/vocabulary.ts";
import type { HouseEmission } from "../facts.ts";
import { identityNameProblem } from "./identity-name.ts";
import { identityTexts } from "../../texts/identities.texts.ts";
function identityIn(emission: HouseEmission): string | undefined {
  if (emission.kind === "house-created") return emission.by;
  if (emission.kind === "granted") return emission.data.identity;
  if (emission.kind === "handed") return emission.data.to;
  return undefined;
}
export function checkIdentity<P extends Foreign>(emission: Emission<P>, runner: string): Emission<P> {
  if (
    emission.layer === "house" &&
    ((emission.kind === "granted" &&
      ("version" in emission.data
        ? emission.data.kit.selections.some(selection => selection.program === "identities")
        : emission.data.tools.includes("identities"))) ||
      (emission.kind === "kit-set" &&
        ("version" in emission.data
          ? emission.data.kit.selections.some(selection => selection.program === "identities")
          : emission.data.tool === "identities")))
  )
    throw new Error(identityTexts.reserved);
  const identity = emission.layer === "house" ? identityIn(emission) : undefined;
  const problem = identity === undefined ? undefined : identityNameProblem(identity, runner);
  if (problem) throw new Error(problem);
  return emission;
}
