import { surfaceFrame, type SurfaceFrame } from "./surface-frame.ts";
import { toolbarAction, type ToolbarAction } from "./toolbar.ts";
import { intentKey } from "./intent.ts";

const dismissal = (action: ToolbarAction | undefined) => action &&
  (action.intent.kind === "close" || action.intent.kind === "back");

/** Task/dialog chrome only. Local selects and contextual popovers do not consume a frame. */
export function transientFrame(frame: SurfaceFrame, locked: boolean): SurfaceFrame {
  const checked = surfaceFrame(frame);
  const navigation = checked.bottom.secondary ?? toolbarAction({ kind: "close" }, "Close", "close");
  const leading = checked.top.leading;
  if (!dismissal(navigation) || navigation.state === "pending" || dismissal(checked.bottom.primary) ||
    (checked.top.trailing ?? []).some(dismissal) ||
    (leading && intentKey(leading.intent) !== intentKey(navigation.intent))) {
    throw new Error("INVALID_TRANSIENT_NAVIGATION");
  }
  const shared = { ...navigation, state: locked ? "unavailable" as const : navigation.state };
  return surfaceFrame({ ...checked,
    top: { ...checked.top, leading: shared },
    bottom: { ...checked.bottom, secondary: shared },
  });
}
