// The ink of a face's glyph per tone (law 9e: the tone paints only the glyph). A face has no ground of its own to colour:
// the ground and hairline are the theme's tm-face primitive, identical on every face, so this table is the only place a
// tone reaches a face: it names glyph classes alone, which Face sets on its content span and nowhere else. A status
// face's tone is its severity; any other face's tone is the ink its host asks for (the contract's `ink`), else neutral.
import type { Static } from "@sinclair/typebox";
import type { Face } from "../../../../interaction/face.ts";
import type { FaceContract } from "./face.contract.ts";

export type FaceTone = "neutral" | Extract<Face, { kind: "status" }>["severity"] | NonNullable<Static<typeof FaceContract["props"]>["ink"]>;

export const glyphTone = {
  neutral: "glyph-neutral",
  warning: "glyph-warning",
  error: "glyph-error",
  accent: "glyph-accent",
  positive: "glyph-positive",
} as const satisfies Readonly<{ [Tone in FaceTone]: `glyph-${Tone}` }>;
