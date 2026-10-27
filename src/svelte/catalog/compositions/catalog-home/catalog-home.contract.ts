// The props of CatalogHome: the resolved catalog home node (featured entry and rails of items), whether to draw only
// the rails (`bodyOnly`), and the node event raised by any item it mounts. `placement` says where the catalog sits:
// "page" when it is the place's own content (its rails then clear the docked navigation), "nested" (the default) inside a
// stack or a library, where its featured entry takes the stack item's content inset.
import { Type } from "@sinclair/typebox";
import { CatalogHomeSchema } from "../../../../public-catalog/node-schema.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const CatalogHomeContract = {
  props: Type.Object({
    node: CatalogHomeSchema,
    bodyOnly: Type.Optional(Type.Boolean()),
    placement: Type.Optional(Type.Union([Type.Literal("page"), Type.Literal("nested")])),
  }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
