// The props of InspectionContent: the bank `catalog` the inspection browses (the installed witness when omitted). A
// caller that binds it may `revealEntry(id)`: the entry opens, comes into view and takes focus, and the promise says
// whether it could.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";
import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";

export const InspectionContentContract = {
  props: Type.Object({
    catalog: Type.Optional(Type.Unsafe<PublicBankInput>()),
  }, { additionalProperties: false }),
  instance: Type.Object({
    revealEntry: Type.Function([ResolvedNodeIdSchema], Type.Promise(Type.Boolean())),
  }, { additionalProperties: false }),
} as const;
