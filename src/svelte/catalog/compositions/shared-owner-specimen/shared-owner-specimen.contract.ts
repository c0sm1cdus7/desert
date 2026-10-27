// The props of SharedOwnerSpecimen: the shared catalog owner whose local example it draws.
import { Type } from "@sinclair/typebox";
import type { SharedOwner } from "../../../infra/shared-owners.ts";

export const SharedOwnerSpecimenContract = {
  props: Type.Object({ owner: Type.Unsafe<SharedOwner>() }, { additionalProperties: false }),
} as const;
