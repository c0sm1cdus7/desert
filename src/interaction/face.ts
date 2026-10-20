import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";

export const FaceSchema = Type.Union([
  Type.Object({ kind: Type.Literal("document") }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("status"), severity: Type.Union([
    Type.Literal("warning"), Type.Literal("error"),
  ]) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("symbol"), text: Type.String({ minLength: 1, maxLength: 8, pattern: "\\S" }) },
    { additionalProperties: false }),
  // An explicit country/region decoration, never derived from a currency or locale.
  Type.Object({ kind: Type.Literal("flag"), region: Type.String({ pattern: "^[A-Z]{2}$", minLength: 2, maxLength: 2 }) },
    { additionalProperties: false }),
]);

export type Face = Frozen<Static<typeof FaceSchema>>;
