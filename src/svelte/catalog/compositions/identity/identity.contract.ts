// Identity takes no props: it reads the signed-in identity from the access context.
import { Type } from "@sinclair/typebox";

export const IdentityContract = {
  props: Type.Object({}, { additionalProperties: false }),
} as const;
