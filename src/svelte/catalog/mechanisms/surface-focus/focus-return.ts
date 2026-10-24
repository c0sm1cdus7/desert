// Part of mechanism surface-focus: where a surface returns focus when it closes. A surface opened from a trigger it
// does not draw (a popover's sheet) returns focus to that trigger, not to whatever happened to hold focus at opening
// (WebKit does not focus a pressed button). The trigger's owner provides it; the opened surface reads it once and
// hides it from its own content, so a surface nested inside never returns to the outer trigger.
import { getContext, setContext } from "svelte";

const returnKey = Symbol("desert.surface-focus-return");
type FocusReturn = () => HTMLElement | null;

/** Provides the element surfaces opened below return focus to. */
export function provideFocusReturn(target: FocusReturn): void { setContext<FocusReturn | undefined>(returnKey, target); }

/** The return target provided above, if any; the caller's own descendants no longer see it. */
export function takeFocusReturn(): FocusReturn | undefined {
  const target = getContext<FocusReturn | undefined>(returnKey);
  setContext<FocusReturn | undefined>(returnKey, undefined);
  return target;
}
