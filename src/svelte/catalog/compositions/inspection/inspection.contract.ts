// The props of Inspection: the bank `catalog` it browses (the installed witness when omitted). A caller that binds it
// may `revealEntry(id)`: any open record detail closes, and the bank entry opens, comes into view and takes focus.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";
import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";

export const InspectionContract = {
  props: Type.Object({
    catalog: Type.Optional(Type.Unsafe<PublicBankInput>()),
  }, { additionalProperties: false }),
  instance: Type.Object({
    revealEntry: Type.Function([ResolvedNodeIdSchema], Type.Promise(Type.Boolean())),
  }, { additionalProperties: false }),
} as const;
