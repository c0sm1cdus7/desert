// The props of Toolbar: the toolbar it draws (a surface's top commands or its bottom choices), `invoke` for the intent of
// the command pressed, the form journey it `submit`s (the command running that journey submits the form `form`), and how
// the surface is presented (a message's top bar has no navigation).
import { Type } from "@sinclair/typebox";
import type { Toolbar } from "../../../../interaction/toolbar.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";

export const ToolbarContract = {
  props: Type.Object({
    toolbar: Type.Unsafe<Toolbar>(),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
    submit: Type.Optional(Type.Object({ journey: Type.String({ minLength: 1 }), form: Type.String({ minLength: 1 }) },
      { additionalProperties: false })),
    presentation: Type.Optional(Type.Union([Type.Literal("standard"), Type.Literal("message"), Type.Literal("transient")])),
  }, { additionalProperties: false }),
} as const;
