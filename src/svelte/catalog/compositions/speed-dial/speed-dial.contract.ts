// The props of SpeedDial: the overflowing commands, whether the dial is open, its trigger kind (create or more actions)
// and `invoke` for the chosen command's intent. `change` carries the next open state.
import { Type } from "@sinclair/typebox";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";
import type { ToolbarAction } from "../../../../interaction/toolbar.ts";

export const SpeedDialContract = {
  props: Type.Object({
    actions: Type.Array(Type.Unsafe<ToolbarAction>()),
    open: Type.Boolean(),
    kind: Type.Optional(Type.Union([Type.Literal("create"), Type.Literal("overflow")])),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
  }, { additionalProperties: false }),
  events: Type.Object({ change: Type.Boolean() }, { additionalProperties: false }),
} as const;
