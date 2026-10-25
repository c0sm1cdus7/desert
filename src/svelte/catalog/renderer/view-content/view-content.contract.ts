// The props of ViewContent: one resolved view and its open media `album` (null for the library root). Node events reach
// `event`, an album to open reaches `album`, and `actions` receives how the workspace reveals a bank entry or selects a
// media record of this view (null once it unmounts). A caller that binds it may ask the same through its instance.
import { Type } from "@sinclair/typebox";
import type { ResolvedView } from "../../../../views/resolved.ts";
import { NodeEventSchema } from "../../../../interaction/node-events.ts";
import { ResolvedNodeIdSchema } from "../../../../interaction/catalog.ts";
import type { WorkspaceContentActions } from "../../../infra/workspace-content.ts";

export const ViewContentContract = {
  props: Type.Object({
    resolved: Type.Unsafe<ResolvedView>(),
    album: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  }, { additionalProperties: false }),
  events: Type.Object({
    event: NodeEventSchema,
    album: Type.String(),
    actions: Type.Union([Type.Unsafe<WorkspaceContentActions>(), Type.Null()]),
  }, { additionalProperties: false }),
  instance: Type.Object({
    revealEntry: Type.Function([ResolvedNodeIdSchema], Type.Promise(Type.Boolean())),
    selectMedia: Type.Function([Type.String()], Type.Boolean()),
  }, { additionalProperties: false }),
} as const;
