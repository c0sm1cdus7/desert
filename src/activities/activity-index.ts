import { createHash } from "node:crypto";
import { loadDefinition } from "../compiled-definition.ts";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import type { Application } from "../local/program.ts";
import type { Mutation } from "../local/types.ts";
import type { ViewTarget } from "../modules/authored-types.ts";
import { authoredViewData, viewTargetDefinition } from "../views/authored-view.ts";
import { viewIndex } from "../views/view-index.ts";
import { createSchemaValidator } from "../validation.ts";
import { ActivityPlanSchema, type ActivityPlan } from "./schema.ts";
import { authoredActivity, type ActivityDefinition } from "./authoring.ts";
import { requireActivityCoverage } from "./coverage.ts";
import { activityJourney, type ActivityJourney } from "./references.ts";
import type { AuthoredView } from "../modules/authored-types.ts";
import { requireActivityBindings, requireActivityViews } from "./views.ts";
import { publicReference } from "../modules/references.ts";
import { requireDefinedView } from "../views/defined-view-registry.ts";
import type { View } from "../views/schema.ts";

const validate = createSchemaValidator<ActivityPlan>(ActivityPlanSchema);
const canonical = (value: unknown) => JSON.stringify(jsonSnapshot(value));
export const activityDigest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const registered = new WeakSet<object>();

export function activityIndex(application: Application, definitions: {
  readonly journeys: readonly ActivityJourney[]; readonly views: readonly ViewTarget[];
}) {
  const installed = loadDefinition(application).journeys ?? [];
  const journeys = new Map(definitions.journeys.map(reference => {
    const journey = activityJourney(reference);
    const actual = installed.find(item => item.id === journey.id);
    if (!actual || canonical(actual) !== canonical(journey)) throw new Error("ACTIVITY_OPERATION_NOT_INSTALLED");
    return [journey.id, freezeDeep(jsonSnapshot(journey) as Mutation)] as const;
  }));
  if (!journeys.size || journeys.size !== definitions.journeys.length) throw new Error("INVALID_ACTIVITY_OPERATIONS");
  const views = viewIndex(definitions.views.map(value => {
    // Issued module references have already crossed the same component admission boundary.
    if (!publicReference(value, "view")) requireDefinedView(value);
    return authoredViewData(viewTargetDefinition(value) as AuthoredView);
  }));
  const journeyReferences = new Map(definitions.journeys.map(value => [value, activityJourney(value).id]));
  const viewReferences = new Map(definitions.views.map(value => [value, String(viewTargetDefinition(value).id)]));
  return installedActivityIndex(application, [...journeys.values()], views, journeyReferences, viewReferences);
}

/** Private host compiler: inputs have already crossed the canonical exposure and ViewProgram boundaries. */
export function installedActivityIndex(application: Application, operations: readonly Frozen<Mutation>[], views: readonly View[],
  journeyReferences: ReadonlyMap<object, string> = new Map(), viewReferences: ReadonlyMap<object, string> = new Map()) {
  const journeys = new Map(operations.map(journey => [journey.id, journey]));
  requireActivityViews(views);
  const digest = activityDigest({ version: "desert.activity-catalog/1", contract: application.digest,
    journeys: [...journeys.values()], views });
  function admit(input: unknown): ActivityPlan {
    const plan = jsonSnapshot(input);
    if (!validate(plan)) throw new Error("INVALID_ACTIVITY_PLAN");
    const journey = journeys.get(plan.journey);
    if (!journey) throw new Error("ACTIVITY_OPERATION_NOT_INSTALLED");
    requireActivityBindings(views, plan);
    requireActivityCoverage(application, journey, plan);
    return freezeDeep<ActivityPlan>(plan);
  }
  const catalog = Object.freeze({ contractDigest: application.digest, digest, views, admit,
    define<const J extends ActivityJourney>(definition: ActivityDefinition<J>) {
      const resolve = (registry: ReadonlyMap<object, string>, value: object) => {
        const id = registry.get(value);
        if (!id) throw new Error("UNREGISTERED_ACTIVITY_REFERENCE");
        return id;
      };
      return admit(authoredActivity(definition, value => resolve(journeyReferences, value), value => resolve(viewReferences, value)));
    },
  });
  registered.add(catalog);
  return catalog;
}
export type ActivityIndex = ReturnType<typeof activityIndex>;
export function requireActivityCatalog(catalog: ActivityIndex | undefined, application: Application): ActivityIndex {
  if (!catalog || !registered.has(catalog)) throw new Error("ACTIVITY_CATALOG_NOT_INSTALLED");
  if (catalog.contractDigest !== application.digest) throw new Error("ACTIVITY_CONTRACT_MISMATCH");
  return catalog;
}
