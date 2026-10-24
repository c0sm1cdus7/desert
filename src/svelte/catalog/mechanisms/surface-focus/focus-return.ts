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

const openKey = Symbol("desert.surface-focus-open");
type OpenFocus = (event: Event) => void;
/** Provides how the surface a child overlay opens places focus (a choice keeps the option the person was exploring). */
export function provideOpenFocus(focus: OpenFocus): void { setContext<OpenFocus | undefined>(openKey, focus); }
/** The open focus provided above, if any; the overlay's own content no longer sees it. */
export function takeOpenFocus(): OpenFocus | undefined {
  const focus = getContext<OpenFocus | undefined>(openKey);
  setContext<OpenFocus | undefined>(openKey, undefined);
  return focus;
}
