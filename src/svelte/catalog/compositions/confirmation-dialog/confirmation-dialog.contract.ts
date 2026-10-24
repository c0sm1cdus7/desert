// The props of ConfirmationDialog: the confirmation frame it asks with (a message and its bottom actions), whether it is
// open or locked while the answer commits, and `invoke` for the chosen action. `closed` fires once it has closed.
import { Type } from "@sinclair/typebox";
import { TopToolbarSchema, BottomToolbarSchema } from "../../../../interaction/toolbar.ts";
import type { SurfaceIntent } from "../../../../interaction/intent.ts";

export const ConfirmationDialogContract = {
  props: Type.Object({
    frame: Type.Object({
      version: Type.Literal("desert.surface-frame/6"), kind: Type.Literal("confirmation"), top: TopToolbarSchema,
      content: Type.Object({ kind: Type.Literal("message"), text: Type.String() }, { additionalProperties: false }),
      bottom: BottomToolbarSchema,
    }, { additionalProperties: false }),
    open: Type.Boolean(),
    locked: Type.Boolean(),
    invoke: Type.Function([Type.Unsafe<SurfaceIntent>()], Type.Void()),
  }, { additionalProperties: false }),
  events: Type.Object({ closed: Type.Void() }, { additionalProperties: false }),
} as const;
