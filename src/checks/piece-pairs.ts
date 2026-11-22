// A screen's rows beside the pieces the bank made of them, and the small words every form rule is written with.
import type { Body, Row, Screen, Span } from "../surface/contract/contract.ts";
import type { Tone } from "../surface/contract/tones.ts";
import type { NoticePiece, OptionsPiece, RowPiece, StackPiece, SurfacePiece } from "../surface/pieces/pieces.ts";

/** One form rule over one screen and its pieces: the places where it does not hold. */
export type Held = (screen: Screen, pieces: SurfacePiece) => readonly string[];
export const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
export const says = (span: Span | undefined, text: string, tone: Tone): boolean =>
  span?.text === text && span.tone === tone;
export const where = (place: string, ok: boolean): readonly string[] => (ok ? [] : [place]);
export const notice = (about: NoticePiece["about"], text: string, tone: Tone): NoticePiece => ({
  kind: "notice",
  about,
  text: { text, tone },
});
export type Thread = Extract<Body, { kind: "thread" }>;
export const threadOf = ({ body }: Screen): Thread | undefined => (body.kind === "thread" ? body : undefined);
export const mainOf = ({ zones: [, { main }] }: SurfacePiece) => main;

/** A stack, or the options of a question, beside its piece. */
export type Group = Readonly<{
  place: string;
  rows: readonly Row[];
  above?: number | undefined;
  below?: number | undefined;
  empty?: string | undefined;
  reads: boolean;
  piece: StackPiece | OptionsPiece | undefined;
}>;
export function groupsOf(screen: Screen, pieces: SurfacePiece): readonly Group[] {
  const { body } = screen;
  const main = mainOf(pieces);
  if (body.kind === "list") {
    const stacks = main.kind === "list" ? main.stacks : [];
    return body.stacks.map((stack, i) => ({
      ...stack,
      place: `stack ${i}`,
      reads: stack.reads === true,
      piece: stacks[i],
    }));
  }
  if (body.kind !== "thread" || !body.options) return [];
  const piece = main.kind === "thread" ? main.options : undefined;
  return [{ place: "options", rows: body.options, ...body.more, reads: false, piece }];
}
/** Each row of the screen beside its piece, at the same index. */
export const pairsOf = (screen: Screen, pieces: SurfacePiece) =>
  groupsOf(screen, pieces).flatMap(group =>
    group.rows.map((row, i) => ({
      place: `${group.place} row ${i}`,
      row,
      piece: group.piece?.rows[i],
      reads: group.reads,
    })),
  );
export const asText = (piece: RowPiece | undefined) => (piece?.as === "text" ? piece : undefined);
export const textRows = (screen: Screen, pieces: SurfacePiece) =>
  pairsOf(screen, pieces).filter(pair => !pair.row.spans && !pair.row.entry);
