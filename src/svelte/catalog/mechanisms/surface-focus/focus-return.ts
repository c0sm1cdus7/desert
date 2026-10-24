// Part of mechanism surface-focus: the focus policy a trigger's owner hands to the sheet it opens without drawing it (a
// popover's or a choice's sheet; design §3.0: the handler passes between foundation folders, never through a contract).
// The sheet returns focus to that trigger, not to whatever held focus at opening (WebKit does not focus a pressed
// button), and may let the owner place focus on opening (a retained option). The opened sheet reads it once and hides
// it from its own content, so a surface nested inside never inherits the outer trigger's policy.
import { getContext, setContext } from "svelte";

const focusKey = Symbol("desert.surface-focus-sheet");
export type SheetFocus = Readonly<{ returnTo: () => HTMLElement | null; open?: ((event: Event) => void) | undefined }>;

/** Provides the focus policy of sheets opened below. */
export function provideSheetFocus(focus: SheetFocus): void { setContext<SheetFocus | undefined>(focusKey, focus); }

/** The policy provided above, if any; the caller's own descendants no longer see it. */
export function takeSheetFocus(): SheetFocus | undefined {
  const focus = getContext<SheetFocus | undefined>(focusKey);
  setContext<SheetFocus | undefined>(focusKey, undefined);
  return focus;
}
