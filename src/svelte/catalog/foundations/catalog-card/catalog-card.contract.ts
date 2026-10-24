// The props of CatalogCard: the resolved catalog card node it draws, and the node event it raises when opened.
import { Type } from "@sinclair/typebox";
import { CatalogCardSchema } from "../../../../public-catalog/node-schema.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const CatalogCardContract = {
  props: Type.Object({ node: CatalogCardSchema }, { additionalProperties: false }),
  events: Type.Object({ event: NodeEventSchema }, { additionalProperties: false }),
} as const;
