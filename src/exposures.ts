import { Check } from "@sinclair/typebox/value";
import { JourneySchema } from "./program-grammar.ts";
import { AuthoredHumanExposureSchema, requireJourneyOwnedSurfaceSemantics, type WithoutSurfaceSemantics } from "./human-exposure.ts";
import { jsonSnapshot } from "./json.ts";
import { closed } from "./views/definition.ts";
import type { ExposedJourney } from "./modules/authored-types.ts";
import { publicReference, requireJourneyUse } from "./modules/references.ts";
import { declarationArray, declarationRecord } from "./modules/declaration-data.ts";

type HumanExposureAuthoring = {
  readonly id: string; readonly journeys: readonly ExposedJourney[]; readonly locale: string;
} & WithoutSurfaceSemantics;
const HumanExposureAuthoringSchema = closed({
  id: AuthoredHumanExposureSchema.properties.id, locale: AuthoredHumanExposureSchema.properties.locale,
  journeys: AuthoredHumanExposureSchema.properties.journeys,
});
function exposedIdentity(value: unknown): string {
  const emitted = publicReference(value, "journey");
  if (emitted) { requireJourneyUse(emitted, "execution"); return emitted.id; }
  if (typeof value === "string") throw new Error("STRING_MODULE_REFERENCE_FORBIDDEN");
  const source = jsonSnapshot(value);
  if (!Check(JourneySchema, source)) throw new Error("MODULE_EXPOSURE_REQUIRES_EXECUTION");
  return source.id;
}

export function humanExposure<const D extends HumanExposureAuthoring>(
  definition: D & Record<Exclude<keyof D, keyof HumanExposureAuthoring>, never>,
) {
  requireJourneyOwnedSurfaceSemantics(definition);
  const source = declarationRecord(definition);
  const journeys = declarationArray(source.journeys);
  const checked = jsonSnapshot({ ...source, journeys: journeys.map(exposedIdentity) });
  if (!Check(HumanExposureAuthoringSchema, checked)) throw new Error("INVALID_HUMAN_EXPOSURE");
  return Object.freeze({ id: checked.id as D["id"], kind: "human" as const, locale: checked.locale,
    journeys: Object.freeze([...journeys]) as D["journeys"] });
}

export function agentExposure<const Id extends string, const J extends readonly ExposedJourney[]>(id: Id, journeys: J) {
  declarationArray(journeys).forEach(exposedIdentity);
  if (!id) throw new Error("INVALID_AGENT_EXPOSURE");
  return Object.freeze({ id, kind: "agent" as const, journeys: Object.freeze([...journeys]) as J });
}
