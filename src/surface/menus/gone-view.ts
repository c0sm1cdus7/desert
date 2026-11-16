// Absence is explicit; exceptions in a surviving view remain defects.
import { MissingView } from "../contract/missing-view.ts";
import { toolOf, type Listed, type Picture, type Session } from "../session/screen.ts";
import type { Tool } from "../contract/shown-tool.ts";
/** Someone else removed what you stand on: it is said as such, never drawn as another screen. What the place you
 * came from no longer lists is gone only if its tool no longer answers for it: a list may let go of what you
 * opened from it because you opened it. */
export function goneView(
  session: Session,
  tools: readonly Tool[],
  stacksOf: (place: Picture, tools: readonly Tool[]) => readonly Listed[],
): boolean {
  const place = session.at(-1);
  const parent = session.at(-2);
  if (place?.kind !== "view" || place.target === undefined) return false;
  if (parent?.kind !== "view" && parent?.kind !== "menu") throw new Error(`nothing lists ${place.target}`);
  if (stacksOf(parent, tools).some(stack => stack.rows.some(row => row.opens === place.target))) return false;
  try {
    toolOf(tools, place.tool).view(place.target);
    return false;
  } catch (error) {
    if (error instanceof MissingView) return true;
    throw error;
  }
}
