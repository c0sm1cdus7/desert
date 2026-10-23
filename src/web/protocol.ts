import { Type, type Static } from "@sinclair/typebox";
import { PrepareOptionsSchema } from "../prepare-options.ts";
import { PreflightOptionsSchema } from "../preflight.ts";
import { ActivityPlanSchema, ActivityOccurrenceSchema, ActivityListSchema } from "../activities/schema.ts";
import type { Frozen } from "../json.ts";
import { imageAssetLimits } from "../assets/policy.ts";
import { AssetReferenceSchema } from "../assets/types.ts";

const Reference = Type.String({ minLength: 1 });
const closed = { additionalProperties: false };
const Revision = Type.Integer({ minimum: 1, maximum: Number.MAX_SAFE_INTEGER });

export const Requests = {
  reserveImage: Type.Object({ runId: Reference, inputField: Reference,
    size: Type.Integer({ minimum: 1, maximum: imageAssetLimits.originalBytes }) }, closed),
  imageStatus: Type.Object({ runId: Reference, inputField: Reference, reference: AssetReferenceSchema.properties.reference }, closed),
  activityCreate: Type.Object({ occurrence: ActivityOccurrenceSchema, plan: ActivityPlanSchema, options: Type.Optional(PreflightOptionsSchema) }, closed),
  activityList: ActivityListSchema,
  activityRead: Type.Object({ id: Reference }, closed),
  activityAnswer: Type.Object({ id: Reference, revision: Revision,
    step: Type.Integer({ minimum: 0, maximum: 31 }), input: Type.Unknown() }, closed),
  activityReopen: Type.Object({ id: Reference, revision: Revision,
    step: Type.Integer({ minimum: 0, maximum: 31 }) }, closed),
  activityPrepare: Type.Object({ id: Reference, revision: Revision }, closed),
  activityCancel: Type.Object({ id: Reference, revision: Revision }, closed),
  preflight: Type.Object({ journeyId: Reference, input: Type.Unknown(), options: Type.Optional(PreflightOptionsSchema) }, closed),
  begin: Type.Object({ journeyId: Reference, subject: Type.Optional(Reference) }, closed),
  prepare: Type.Object({ runId: Reference, input: Type.Unknown(), options: Type.Optional(PrepareOptionsSchema) }, closed),
  read: Type.Object({ runId: Reference }, closed),
  accept: Type.Object({ intentId: Reference, confirmationDigest: Reference }, closed),
  receipt: Type.Object({ intentId: Reference }, closed),
  offer: Type.Object({ journeyId: Reference, subject: Reference }, closed),
};

export type Method = keyof typeof Requests;
export type RequestInput<K extends Method> = Frozen<Static<(typeof Requests)[K]>>;
