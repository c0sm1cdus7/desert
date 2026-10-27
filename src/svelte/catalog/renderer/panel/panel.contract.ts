// The props of Panel: the owned resolved panel to show (none or null closes it). Every event of the panel reaches
// `onevent` with the owner it was mounted for.
import { Type } from "@sinclair/typebox";
import type { OwnedResolvedPanel, OwnedViewEvent } from "../../../../web/client/view-events.ts";

export const PanelContract = {
  props: Type.Object({
    panel: Type.Optional(Type.Union([Type.Unsafe<OwnedResolvedPanel>(), Type.Null()])),
  }, { additionalProperties: false }),
  events: Type.Object({
    event: Type.Unsafe<OwnedViewEvent>(),
  }, { additionalProperties: false }),
} as const;
