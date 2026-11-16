// The tones a surface may use: each renderer gives them its own values.
export type UiTone = "bg" | "t1" | "t2" | "t3" | "line" | "being" | "ok" | "wait" | "cut";
export type Tone = UiTone | DataTone;
/** A chart's series, in order: the surface paints them, never the being's turquoise. */
export type DataTone = "d1" | "d2" | "d3" | "d4" | "d5";
