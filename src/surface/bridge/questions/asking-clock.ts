// Questions share the house's instant; a missing local calendar is a declaration defect, never a guessed day.
import { askingClock } from "../context/local-calendar.ts";
export { askingClock } from "../context/local-calendar.ts";
import { formats, type Locale } from "../../masks.ts";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
export const questionWords = (
  now: () => number,
  shown: Readonly<{ locale: Locale; day?: ((at: number) => string) | undefined }>,
  context: Readonly<{ state?: () => unknown; target?: string }> = {},
) => ({
  ...askingClock(now, shown.day?.bind(shown)),
  ...context,
  formats: formats(shown.locale),
  optionalMark: genericTexts.optional,
});
