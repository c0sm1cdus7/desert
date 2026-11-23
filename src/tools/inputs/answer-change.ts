// One interpretation of unchanged, whether the program declares it or current data proves it.
import { same, type Text } from "../../fields/phrases.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
export function answerChange<T extends Text>(reason?: T, unchangedAnyway = false, current?: boolean) {
  if (same(reason, toolTexts.invalid)) throw new OutsideDefect("Invalid data is not a disabled reason");
  const unchanged = same(reason, toolTexts.unchanged) || (reason === undefined && unchangedAnyway);
  if (unchanged && current === false)
    throw new OutsideDefect("An unchanged answer differs from the declared current value");
  const kept: T | undefined = unchanged ? undefined : reason;
  const refusal: Text | undefined = unchanged ? toolTexts.unchanged : reason;
  const detail: Text | undefined = unchanged ? surfaceTexts.current : reason;
  return { unchanged, reason: kept, refusal, detail };
}
export function answerValidity<T extends Text>(valid: boolean | undefined, reason?: T): T | undefined {
  if (valid === false && reason === undefined)
    throw new OutsideDefect("An answer is invalid or closed without a declared reason");
  return reason;
}
