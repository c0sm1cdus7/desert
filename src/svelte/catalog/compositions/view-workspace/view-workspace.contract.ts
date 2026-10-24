// The props of ViewWorkspace: the view program, its active destination, the resolved view and the open panel (none or null
// when closed), the last error and whether the state is uncertain. Every view event reaches `onevent`; a navigation
// reaches `onnavigate` with the destination id.
import { Type } from "@sinclair/typebox";
import { ViewProgramSchema } from "../../../../views/program-schema.ts";
import type { OwnedResolvedPanel, OwnedResolvedView, OwnedViewEvent } from "../../../../web/client/view-events.ts";

export const ViewWorkspaceContract = {
  props: Type.Object({
    program: ViewProgramSchema,
    activeDestination: Type.String(),
    resolved: Type.Unsafe<OwnedResolvedView>(),
    panel: Type.Optional(Type.Union([Type.Unsafe<OwnedResolvedPanel>(), Type.Null()])),
    error: Type.Union([Type.String(), Type.Null()]),
    uncertain: Type.Boolean(),
  }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Unsafe<OwnedViewEvent>(),
    navigate: Type.String(),
  }, { additionalProperties: false }),
} as const;
