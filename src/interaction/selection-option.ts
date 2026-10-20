import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";

/** The label remains the identity; a face is optional, passive decoration. */
export const SelectionOptionSchema = Type.Object({
  value: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  disabled: Type.Boolean(),
  face: Type.Optional(FaceSchema),
}, { additionalProperties: false });

export type SelectionOption = Frozen<Static<typeof SelectionOptionSchema>>;
