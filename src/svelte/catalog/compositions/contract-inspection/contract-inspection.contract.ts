// The props of ContractInspection: the id of the resolved node kind whose contract it reads.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";

export const ContractInspectionContract = {
  props: Type.Object({
    id: ResolvedNodeIdSchema,
  }, { additionalProperties: false }),
} as const;
