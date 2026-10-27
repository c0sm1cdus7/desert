import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { ActionIconSchema } from './action-icon.ts';

/** The glyphs a face may draw: every action icon and the glyphs of a workspace's navigation destinations (a place to
 * browse, the travel kit, the developer bank). A navigation destination's face is this one Face (law 9e). */
export const FaceIconSchema = Type.Union([ActionIconSchema, Type.Literal("landmark"), Type.Literal("backpack"), Type.Literal("panels")]);
export type FaceIcon = Static<typeof FaceIconSchema>;

export const FaceSchema = Type.Union([
  Type.Object({ kind: Type.Literal('icon'), icon: FaceIconSchema }, { additionalProperties: false }),
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
