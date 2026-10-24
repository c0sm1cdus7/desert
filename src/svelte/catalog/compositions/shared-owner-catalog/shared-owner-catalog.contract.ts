// The props of SharedOwnerCatalog: the shared owner on show (null for none) and `hosted`, true when a host already draws
// the navigation and header. It emits `select` with the owner to show next, or null to go back.
import { Type } from "@sinclair/typebox";
import type { SharedOwner } from "../../../infra/shared-owners.ts";

export const SharedOwnerCatalogContract = {
  props: Type.Object({
    selected: Type.Union([Type.Unsafe<SharedOwner>(), Type.Null()]),
    hosted: Type.Boolean(),
  }, { additionalProperties: false }),
  events: Type.Object({ select: Type.Union([Type.Unsafe<SharedOwner>(), Type.Null()]) }, { additionalProperties: false }),
} as const;
