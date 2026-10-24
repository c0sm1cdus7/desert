// The props of CatalogDetail: the resolved catalog item it reads; `bodyOnly` to draw only its prose (the host already
// shows the media and the title); and `placement`: "page" when it is the place's own content (its reading block then
// clears the docked navigation), "nested" (the default) inside a stack, a bank or an inspection. `event` is the node event
// channel every catalog node accepts.
import { Type } from "@sinclair/typebox";
import { CatalogDetailSchema } from "../../../../public-catalog/node-schema.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const CatalogDetailContract = {
  props: Type.Object({
    node: CatalogDetailSchema,
    bodyOnly: Type.Optional(Type.Boolean()),
    placement: Type.Optional(Type.Union([Type.Literal("page"), Type.Literal("nested")])),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
