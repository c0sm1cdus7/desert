// The local calendar shares the action clock; a missing calendar is a declaration defect.
import { programCall } from "../../../tools/boundaries/program-call.ts";
import { OutsideDefect } from "../../../tools/outside.ts";
export function askingClock(now: () => number, day: ((at: number) => string) | undefined) {
  const today = (): string => {
    if (!day) throw new OutsideDefect("A dated question needs the program's local calendar");
    return programCall(day, now());
  };
  return { now, today };
}
