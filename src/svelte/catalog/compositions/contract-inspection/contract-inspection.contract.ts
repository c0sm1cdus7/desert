// The props of ContractInspection: the id of the resolved node kind whose contract it reads.
import { Type } from "@sinclair/typebox";
import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";

export const ContractInspectionContract = {
  props: Type.Object({
    id: Type.Unsafe<ResolvedNodeId>(),
  }, { additionalProperties: false }),
} as const;
