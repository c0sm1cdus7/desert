// The props of FailureDialog: the failure code to explain (null shows nothing), whether its outcome is uncertain,
// and how to close it.
import { Type } from "@sinclair/typebox";

export const FailureDialogContract = {
  props: Type.Object({
    code: Type.Union([Type.String(), Type.Null()]),
    uncertain: Type.Optional(Type.Boolean()),
    close: Type.Function([], Type.Void()),
  }, { additionalProperties: false }),
} as const;
