// The props of CatalogDetail: the resolved catalog item it reads, and `bodyOnly` to draw only its prose (the host
// already shows the media and the title). `event` is the node event channel every catalog node accepts.
import { Type } from "@sinclair/typebox";
import type { ResolvedNodeFor } from "../../../../interaction/resolved-node.ts";
import type { NodeEvent } from "../../../../interaction/node-events.ts";

export const CatalogDetailContract = {
  props: Type.Object({
    node: Type.Unsafe<ResolvedNodeFor<"catalog.detail">>(),
    bodyOnly: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({ event: Type.Unsafe<NodeEvent>() }, { additionalProperties: false }),
} as const;
