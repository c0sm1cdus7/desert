// The props of AccessGate: the human surface it runs against, the generated input validator, and the view program it
// mounts once a session is ready.
import { Type } from "@sinclair/typebox";
import type { HumanSurface, ValidateInput } from "../../../../web/types.ts";
import type { ViewProgram } from "../../../../views/program-schema.ts";

export const AccessGateContract = {
  props: Type.Object({
    surface: Type.Unsafe<HumanSurface>(),
    validateInput: Type.Unsafe<ValidateInput>(),
    viewProgram: Type.Unsafe<ViewProgram>(),
  }, { additionalProperties: false }),
} as const;
