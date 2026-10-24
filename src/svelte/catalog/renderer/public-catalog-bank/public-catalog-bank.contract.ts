// The props of PublicCatalogBank: the bank `surface` (product, home and details) and `bodyOnly` to draw it without its
// own header. Bank events reach `oncatalog`; `onactions` receives how the workspace reveals an entry (null on unmount).
import { Type } from "@sinclair/typebox";
import type { NodeEvent } from "../../../../interaction/node-events.ts";
import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";
import type { WorkspaceContentActions } from "../../../infra/workspace-content.ts";

export const PublicCatalogBankContract = {
  props: Type.Object({
    surface: Type.Unsafe<PublicBankInput>(),
    bodyOnly: Type.Optional(Type.Boolean()),
  }, { additionalProperties: false }),
  events: Type.Object({
    catalog: Type.Unsafe<NodeEvent>(),
    actions: Type.Union([Type.Unsafe<WorkspaceContentActions>(), Type.Null()]),
  }, { additionalProperties: false }),
} as const;
