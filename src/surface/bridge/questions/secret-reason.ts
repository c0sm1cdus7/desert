// Why an invalid secret does not advance, from its schema bounds alone: never a reference or its contents.
import type { TSchema } from "@sinclair/typebox";
import type { Language } from "../../../fields/languages.ts";
import { wordsIn } from "../../../fields/phrases.ts";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
/** Invalid secret material yields only schema bounds, never a reference or its contents. */
export function secretReason(schema: TSchema, typed: string, language: Language): string {
  const generic = wordsIn(genericTexts, language);
  if (typed === "") return generic.lacks.missing;
  const length = Array.from(typed).length;
  if (typeof schema.minLength === "number" && length < schema.minLength)
    return generic.lacks.least(generic.lacks.characters(schema.minLength));
  if (typeof schema.maxLength === "number" && length > schema.maxLength)
    return generic.lacks.most(generic.lacks.characters(schema.maxLength));
  return generic.lacks.shape;
}
