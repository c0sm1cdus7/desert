// The props of LocalExerciseContent: the exercises `definition` it keeps as a local draft, `bodyOnly` to omit the place
// chrome, and `oncatalog`, raised when an exercise opens a catalog entry (required when the definition holds catalog cards).
import { Type } from "@sinclair/typebox";
import type { PublicCatalogExercises } from "../../../../public-catalog/client.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const LocalExerciseContentContract = {
  props: Type.Object({
    definition: Type.Unsafe<PublicCatalogExercises>(),
    bodyOnly: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({
    catalog: NodeEventSchema,
  }, { additionalProperties: false }),
} as const;
