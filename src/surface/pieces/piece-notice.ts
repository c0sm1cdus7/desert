// What the surface itself says in one quiet line: what is left out, an empty stack, a reference, too small a room.
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import type { NoticePiece } from "./pieces.ts";

const arrows = { above: "↑", below: "↓" } as const;
/** How many are left out above or below what is shown: a painter that cuts by its own room calls it with its count,
 * and never composes the words. */
export const leftOut = (way: "above" | "below", n: number): NoticePiece => ({
  kind: "notice",
  about: way,
  text: { text: `${arrows[way]} ${n} ${said.more}`, tone: "t3" },
});
/** What a stack or the options of a question leave out, only where they leave something out. */
export const countedOut = (
  above: number | undefined,
  below: number | undefined,
): { readonly above?: NoticePiece; readonly below?: NoticePiece } => ({
  ...(above ? { above: leftOut("above", above) } : {}),
  ...(below ? { below: leftOut("below", below) } : {}),
});
/** What an empty stack says: present even when it says nothing, a painter spends its row on it. */
export const emptyNotice = (text: string): NoticePiece => ({
  kind: "notice",
  about: "empty",
  text: { text, tone: "t1" },
});
export const referenceNotice = (text: string): NoticePiece => ({
  kind: "notice",
  about: "reference",
  text: { text, tone: "t3" },
});
/** What a painter shows alone when it has less room than its own minimum. */
export const smallNotice: NoticePiece = { kind: "notice", about: "small", text: { text: said.tooSmall, tone: "t1" } };
