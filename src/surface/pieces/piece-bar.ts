// The Barra with its Latido, and the Toolbar with its actions: what a screen says above and below what it shows.
import type { Hint, Screen } from "../contract/contract.ts";
import { hintSends } from "../contract/hint-sends.ts";
import type { Tone } from "../contract/tones.ts";
import { controlNames, fixedControls } from "./controls.ts";
import type { ActionPiece, BarPiece, BeatPiece, ToolbarPiece } from "./pieces.ts";

/** Each state of the connection, its one point and its tone. */
export const beats = {
  connected: ["●", "ok"],
  connecting: ["●", "wait"],
  "signal-lost": ["×", "cut"],
  disconnected: ["×", "t3"],
} as const satisfies Readonly<Record<Screen["state"], readonly [BeatPiece["icon"], Tone]>>;
export const beatOf = (state: Screen["state"]): BeatPiece => ({
  kind: "beat",
  state,
  icon: beats[state][0],
  tone: beats[state][1],
});
/** The title, the beat, the clock and the battery when there is one: no word of its own. */
export const barOf = (screen: Screen): BarPiece => ({
  kind: "bar",
  title: { text: screen.title, tone: "t1", bold: true },
  beat: beatOf(screen.state),
  clock: { text: screen.clock, tone: "t1" },
  ...(screen.battery ? { battery: { text: screen.battery, tone: "t2" } } : {}),
});
/** One hint of this screen: the name of its key, its verb as the screen says it, and what it sends. */
export const actionOf = (hint: Hint): ActionPiece => ({
  kind: "action",
  control: hint.intent,
  key: { text: controlNames[hint.intent], tone: "t2" },
  does: { text: hint.does, tone: "t3" },
  sends: hintSends[hint.intent],
});
export const toolbarOf = (screen: Screen): ToolbarPiece => ({
  kind: "toolbar",
  fixed: fixedControls(screen.menu),
  aids: screen.hints.map(actionOf),
});
