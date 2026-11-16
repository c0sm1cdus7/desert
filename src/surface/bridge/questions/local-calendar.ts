// The local calendar shares the action clock; a missing calendar is a declaration defect.
import { programCall, OutsideDefect } from "../../../fields/program-call.ts";

export function askingClock(now: () => number, day: ((at: number) => string) | undefined) {
  const today = (): string => {
    if (!day) throw new OutsideDefect("A dated question needs the program's local calendar");
    return programCall(day, now());
  };
  return { now, today };
}
