// A resolved screen as the closed pieces every painter draws: no state, no clock, no size, no measure.
import type { Language } from "../../fields/languages.ts";
import type { Body, Screen } from "../contract/contract.ts";
import { barOf, toolbarOf } from "./piece-bar.ts";
import { smallNotice } from "./piece-notice.ts";
import { listPiece } from "./piece-rows.ts";
import { focusPiece, panelPiece, threadPiece } from "./piece-thread.ts";
import type { ContentPiece, SurfacePiece } from "./pieces.ts";

function contentOf(body: Body, language: Language): ContentPiece {
  if (body.kind === "list") return listPiece(body, language);
  if (body.kind === "focus") return focusPiece(body);
  return threadPiece(body, language);
}
/** The same pieces for the same screen, the three zones in the order they never leave. */
export function piecesOf(screen: Screen): SurfacePiece {
  return {
    kind: "surface",
    zones: [
      barOf(screen),
      { main: contentOf(screen.body, screen.language), ...(screen.panel ? { beside: panelPiece(screen.panel) } : {}) },
      toolbarOf(screen),
    ],
    small: smallNotice(screen.language),
    language: screen.language,
  };
}
