// The props of CatalogHome: the resolved catalog home node (featured entry and rails of items), whether to draw only
// the rails (`bodyOnly`), and the node event raised by any item it mounts.
import { Type } from "@sinclair/typebox";
import { CatalogHomeSchema } from "../../../../public-catalog/node-schema.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const CatalogHomeContract = {
  props: Type.Object({ node: CatalogHomeSchema, bodyOnly: Type.Optional(Type.Boolean()) }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
