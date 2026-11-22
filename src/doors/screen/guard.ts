// What an Enter meant on a screen a person saw: a batch that commits to it is refused when it means something else now.
import type { Intent, Screen, Span } from "../../surface/contract/contract.ts";

/** What an intent that commits to the screen commits to: where it is, what is chosen, what Enter says there, and the
 * identities of the rows one can point at. */
export interface Commitment {
  readonly title: string;
  readonly chosen: string | undefined;
  readonly enter: string | undefined;
  readonly rows: readonly string[];
}
const plain = (spans: readonly Span[]): string => spans.map(span => span.text).join("");
/** The text of what is chosen, as the conformance kit's chosenText reads it (a door may not import the kit). */
function chosenOf({ body }: Screen): string | undefined {
  if (body.kind === "focus") return undefined;
  if (body.kind === "list") return body.stacks.flatMap(stack => stack.rows).find(row => row.selected)?.title;
  const option = body.options?.find(row => row.selected)?.title;
  if (option) return option;
  const event = body.events.find(known => known.selected);
  if (event) return plain(event.text);
  return body.events.flatMap(known => known.attachments ?? []).find(attachment => attachment.selected)?.title;
}
/** The identity of every row of a list or of a question's options that can be chosen now. An id is never read. */
function rowsOf({ body }: Screen): readonly string[] {
  const rows = body.kind === "list" ? body.stacks.flatMap(stack => stack.rows) : [];
  const options = body.kind === "thread" ? (body.options ?? []) : [];
  return [...rows, ...options].flatMap(row => (row.id === undefined ? [] : [row.id]));
}
export const commitmentOf = (screen: Screen): Commitment => ({
  title: screen.title,
  chosen: chosenOf(screen),
  enter: screen.hints.find(hint => hint.intent === "confirm")?.does,
  rows: rowsOf(screen),
});
const sameCommitment = (a: Commitment, b: Commitment): boolean =>
  a.title === b.title && a.chosen === b.chosen && a.enter === b.enter;
/** A row pointed at is the same row wherever it moved and whatever its datum says now: it holds while the screen keeps
 * its title and the row is there, as it was on the screen the person saw. */
const pointedHolds = (seen: Commitment, now: Commitment, row: string): boolean =>
  seen.title === now.title && seen.rows.includes(row) && now.rows.includes(row);
/** S6: whether every intent of a batch still means, on the screen now, what it meant on the screen seen. */
export const holds = (seen: Commitment, now: Commitment, intents: readonly Intent[]): boolean =>
  intents.every(intent => {
    if (intent.kind === "choose") return pointedHolds(seen, now, intent.row);
    return !guarded(intent) || sameCommitment(seen, now);
  });
/** S7: whether an intent commits to what is on screen. No default: a new kind of intent does not compile here until
 * someone says whether it is guarded. Typing, moving, leaving and pasting apply to where the session is. */
export function guarded(intent: Intent): boolean {
  switch (intent.kind) {
    case "confirm":
    case "choose":
      return true;
    case "up":
    case "down":
    case "left":
    case "right":
    case "cancel":
    case "erase":
    case "menu":
    case "quit":
    case "switch":
    case "type":
    case "paste":
      return false;
  }
}
