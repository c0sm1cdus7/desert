// Questions share the house's instant; a missing local calendar is a declaration defect, never a guessed day.
import { formats, type Locale } from "../../masks.ts";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
import { OutsideDefect } from "../../../tools/outside.ts";

export function askingClock(now: () => number, day: ((at: number) => string) | undefined) {
  const today = (): string => {
    if (!day) throw new OutsideDefect("A dated question needs the program's local calendar");
    return day(now());
  };
  return { now, today };
}

export const questionWords = (
  now: () => number,
  shown: Readonly<{ locale: Locale; day?: ((at: number) => string) | undefined }>,
) => ({
  ...askingClock(now, shown.day),
  formats: formats(shown.locale),
  optionalMark: genericTexts.optional,
});
