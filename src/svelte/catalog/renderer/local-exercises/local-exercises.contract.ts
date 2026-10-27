// The props of LocalExercises: the public catalog exercises (place content drawn locally), whether to draw only the
// body (`bodyOnly`), and the node event it raises toward the catalog (`catalog`).
import { Type } from "@sinclair/typebox";
import { PublicCatalogExercisesSchema } from "../../../../public-catalog/exercises.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const LocalExercisesContract = {
  props: Type.Object({ definition: PublicCatalogExercisesSchema, bodyOnly: Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  events: Type.Object({ catalog: NodeEventSchema }, { additionalProperties: false }),
} as const;
