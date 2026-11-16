// Why an invalid secret does not advance, from its schema bounds alone: never a reference or its contents.
import type { TSchema } from "@sinclair/typebox";
import { genericTexts as generic } from "../../texts/generic-surface.texts.ts";
/** Invalid secret material yields only schema bounds, never a reference or its contents. */
export function secretReason(schema: TSchema, typed: string): string {
  if (typed === "") return generic.lacks.missing;
  const length = Array.from(typed).length;
  if (typeof schema.minLength === "number" && length < schema.minLength)
    return generic.lacks.least(generic.lacks.characters(schema.minLength));
  if (typeof schema.maxLength === "number" && length > schema.maxLength)
    return generic.lacks.most(generic.lacks.characters(schema.maxLength));
  return generic.lacks.shape;
}
