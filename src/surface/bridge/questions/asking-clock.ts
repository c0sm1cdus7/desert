// Questions share the house's instant; a missing local calendar is a declaration defect, never a guessed day.
import { askingClock } from "./local-calendar.ts";
import { formats, type Locale } from "../../formats/masks.ts";
import type { Language } from "../../../fields/languages.ts";
import { said } from "../../../fields/phrases.ts";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
export { askingClock } from "./local-calendar.ts";
export const questionWords = (
  now: () => number,
  shown: Readonly<{ locale: Locale; day?: ((at: number) => string) | undefined }>,
  language: Language,
  context: Readonly<{ state?: () => unknown; target?: string }> = {},
) => ({
  ...askingClock(now, shown.day?.bind(shown)),
  ...context,
  language,
  formats: formats(shown.locale),
  optionalMark: said(genericTexts.optional, language),
});
