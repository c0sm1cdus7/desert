// The props of PublicCatalogBank: the bank `surface` (product, home and details) and `bodyOnly` to draw it without its
// own header. Bank events reach `oncatalog`; `onactions` receives how the workspace reveals an entry (null on unmount).
// A caller that binds it may `revealEntry(id)`: the entry opens, comes into view and takes focus; the promise says
// whether it could.
import { Type } from "@sinclair/typebox";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";
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
  instance: Type.Object({
    revealEntry: Type.Function([ResolvedNodeIdSchema], Type.Promise(Type.Boolean())),
  }, { additionalProperties: false }),
} as const;
