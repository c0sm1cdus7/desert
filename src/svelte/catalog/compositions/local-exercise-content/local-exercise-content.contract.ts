// The props of LocalExerciseContent: the exercises `definition` it keeps as a local draft, `bodyOnly` to omit the place
// chrome, and `oncatalog`, raised when an exercise opens a catalog entry (required when the definition holds catalog cards).
import { Type } from "@sinclair/typebox";
import { PublicCatalogExercisesSchema } from "../../../../public-catalog/exercises.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const LocalExerciseContentContract = {
  props: Type.Object({
    definition: PublicCatalogExercisesSchema,
    bodyOnly: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({
    catalog: NodeEventSchema,
  }, { additionalProperties: false }),
} as const;
