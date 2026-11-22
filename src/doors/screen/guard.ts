// What an Enter meant on a screen a person saw: a batch that commits to it is refused when it means something else now.
import type { Intent, Screen, Span } from "../../surface/contract/contract.ts";

/** What an intent that commits to the screen commits to: where it is, what is chosen, and what Enter says there. */
export interface Commitment {
  readonly title: string;
  readonly chosen: string | undefined;
  readonly enter: string | undefined;
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
export const commitmentOf = (screen: Screen): Commitment => ({
  title: screen.title,
  chosen: chosenOf(screen),
  enter: screen.hints.find(hint => hint.intent === "confirm")?.does,
});
export const sameCommitment = (a: Commitment, b: Commitment): boolean =>
  a.title === b.title && a.chosen === b.chosen && a.enter === b.enter;
/** S7: whether an intent commits to what is on screen. No default: a new kind of intent does not compile here until
 * someone says whether it is guarded. Typing, moving, leaving and pasting apply to where the session is. */
export function guarded(intent: Intent): boolean {
  switch (intent.kind) {
    case "confirm":
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
