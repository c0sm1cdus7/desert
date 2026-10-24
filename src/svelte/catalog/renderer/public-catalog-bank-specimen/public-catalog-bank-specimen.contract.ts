// The props of PublicCatalogBankSpecimen: the resolved node it starts from, and the catalog navigation events
// (open, back, search) it passes on; every other event stays in its local diagnostic state.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeSchema } from "../../../../interaction/resolved-node-schema.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";

export const PublicCatalogBankSpecimenContract = {
  props: Type.Object({ initial: ResolvedNodeSchema }, { additionalProperties: false }),
  events: Type.Object({ catalog: NodeEventSchema }, { additionalProperties: false }),
} as const;
