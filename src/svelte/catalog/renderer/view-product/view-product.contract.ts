// The props of ViewProduct: the view program to run, the human surface it runs against, the generated input validator,
// and optionally the access client's `lock`, so the product can lock itself.
import { Type } from "@sinclair/typebox";
import type { ViewProgram } from "../../../../views/program-schema.ts";
import type { HumanSurface, ValidateInput } from "../../../../web/types.ts";
import type { AccessClient } from "../../../../web/client/access.ts";

export const ViewProductContract = {
  props: Type.Object({
    program: Type.Unsafe<ViewProgram>(),
    surface: Type.Unsafe<HumanSurface>(),
    validateInput: Type.Unsafe<ValidateInput>(),
    access: Type.Optional(Type.Unsafe<Pick<AccessClient, "lock">>()),
  }, { additionalProperties: false }),
} as const;
