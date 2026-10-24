// The props of InspectionCatalog: the bank `surface` (product, home and details) and `bodyOnly`, true when a host
// already heads it. Bank events reach `oncatalog`. A caller that binds it may `revealEntry(id)`: the entry opens, comes
// into view and takes focus, and the promise says whether it could.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";
import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";

export const InspectionCatalogContract = {
  props: Type.Object({
    surface: Type.Unsafe<PublicBankInput>(),
    bodyOnly: Type.Boolean(),
  }, { additionalProperties: false }),
  events: Type.Object({ catalog: NodeEventSchema }, { additionalProperties: false }),
  instance: Type.Object({
    revealEntry: Type.Function([ResolvedNodeIdSchema], Type.Promise(Type.Boolean())),
  }, { additionalProperties: false }),
} as const;
