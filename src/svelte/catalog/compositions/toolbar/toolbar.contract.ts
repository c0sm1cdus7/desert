// The props of Toolbar: the toolbar it draws, `invoke` for the intent of the command pressed, the form a submit command
// submits, how the surface is presented, and the custom controls it carries (a calendar).
import { Type } from "@sinclair/typebox";
import type { Toolbar } from "../../../../interaction/toolbar.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";
import type { ToolbarControls } from "../../../infra/toolbar-controls.ts";

export const ToolbarContract = {
  props: Type.Object({
    toolbar: Type.Unsafe<Toolbar>(),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
    submit: Type.Optional(Type.String()),
    presentation: Type.Optional(Type.Union([Type.Literal("standard"), Type.Literal("message"), Type.Literal("transient")])),
    controls: Type.Optional(Type.Unsafe<ToolbarControls>()),
  }, { additionalProperties: false }),
} as const;
