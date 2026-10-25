// The props of PlaceContent (DESIGN §3.0): the place's checked `definition` (title, subtitle and stacks) and `bodyOnly`
// to leave out its heading when the host already shows it. Every stack's interaction reaches `event` as a node event.
// The file host its controls read travels by context, never as a prop.
import { Type } from "@sinclair/typebox";
import { PlaceContentSchema } from "../../../../interaction/place.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const PlaceContentContract = {
  props: Type.Object({
    definition: PlaceContentSchema,
    bodyOnly: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
