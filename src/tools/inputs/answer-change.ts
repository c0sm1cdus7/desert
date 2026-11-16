// One interpretation of unchanged, whether the program declares it or current data proves it.
import { toolTexts } from "../../texts/tools.texts.ts";
import { surfaceTexts } from "../../texts/surface.texts.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
export function answerChange(reason?: string, same = false, current?: boolean) {
  if (reason === toolTexts.invalid) throw new OutsideDefect("Invalid data is not a disabled reason");
  const unchanged = reason === toolTexts.unchanged || (reason === undefined && same);
  if (unchanged && current === false)
    throw new OutsideDefect("An unchanged answer differs from the declared current value");
  return {
    unchanged,
    reason: unchanged ? undefined : reason,
    refusal: unchanged ? toolTexts.unchanged : reason,
    detail: unchanged ? surfaceTexts.current : reason,
  };
}
export function answerValidity(valid: boolean | undefined, reason?: string): string | undefined {
  if (valid === false && reason === undefined)
    throw new OutsideDefect("An answer is invalid or closed without a declared reason");
  return reason;
}
