// The names of what a skin gives a value to: colour, space, type, radius and motion. Names and types only.
import type { Theme } from "../contract/contract.ts";
import type { Tone } from "../contract/tones.ts";
/** Every colour a painter may use: the tones of the contract, and the ground of what has the focus. */
export type ColorToken = Tone | "focus";
/** One cell of indent; the air between events and stacks; the side margin; the content column; the place a stack
 * keeps for keys; where what opened beside starts. */
export type SpaceToken = "cell" | "row" | "edge" | "block" | "key" | "split";
/** One font, one size and line, two weights. */
export type TypeToken = "family" | "size" | "line" | "regular" | "bold";
/** The corners of the focused block, and of the pill. */
export type RadiusToken = "focus" | "pill";
/** The one tick, and the fade of the word that beats. */
export type MotionToken = "tick" | "pulse";
/** A skin gives every token a value, in every theme: the visual direction is this and the style of each piece. */
export interface Skin<Color, Measure> {
  readonly color: Readonly<Record<Theme, Readonly<Record<ColorToken, Color>>>>;
  readonly space: Readonly<Record<SpaceToken, Measure>>;
  readonly type: Readonly<Record<TypeToken, Measure>>;
  readonly radius: Readonly<Record<RadiusToken, Measure>>;
  readonly motion: Readonly<Record<MotionToken, Measure>>;
}
