// Mechanism pane-context (owned by modal): what an edge pane tells the pieces it holds, so each styles its own marks
// and none styles another's. `drag`: the pane's header drags it (a lateral or side pane, not docked); `dragging`: a drag
// is under way; `framed`: the piece sits in a frame (not a message) inside the pane. A nested sheet or dialog, portalled
// outside the pane, provides no pane.
import { getContext, setContext } from "svelte";

export type Pane = Readonly<{ drag: boolean; dragging: boolean; framed: boolean }>;
type ReadPane = () => Pane | undefined;
const paneKey = Symbol("desert.pane-context");

/** Provides the pane its descendants read; `undefined` ends an enclosing pane's reach. */
export function providePane(read: ReadPane): void { setContext(paneKey, read); }

/** The enclosing pane, read when its descendants render. */
export function usePane(): ReadPane {
  return getContext<ReadPane | undefined>(paneKey) ?? (() => undefined);
}
