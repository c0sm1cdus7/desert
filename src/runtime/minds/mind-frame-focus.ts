// Bounds what a frame shows to what happened since the mind last answered, and serves the rest to the read act.
import type { Event } from "../../journal/vocabulary.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import type { MindState } from "../../house/minds/mind-state.ts";
import type { FrameItem } from "./mind-frame.ts";
/** The seq after which a scope has not answered yet: the opening of its last turn that closed done. A failed or cut
 * turn does not move it, so what only such a turn saw comes again. A journey that never answered reads from the facts
 * that woke the consciousness turn that opened it; a mind that never answered, from the start. */
export function answeredMark(minds: MindState, history: readonly Event[], scope: MindScope, turn: string): number {
  const done = [...minds.turns.values()].filter(
    each =>
      each.opened.data.turn !== turn &&
      each.opened.by === scope.actor &&
      each.opened.process === scope.process &&
      each.closed?.data.outcome === "done",
  );
  if (done.length) return Math.max(...done.map(each => each.opened.seq));
  if (scope.kind !== "journey") return 0;
  const opened = history.find(e => e.layer === "house" && e.kind === "journey-opened" && e.process === scope.process);
  if (!opened) return 0;
  const by = history.find(e => opened.cause.includes(e.id) && e.layer === "house" && e.kind === "mind-turn-opened");
  const woke = by?.layer === "house" && by.kind === "mind-turn-opened" ? by.data.wake : [];
  const seqs = history.filter(e => woke.includes(e.id)).map(e => e.seq);
  return (seqs.length ? Math.min(...seqs) : opened.seq) - 1;
}
/** Activity after the mark, without the facts that woke this turn (Despertar says them), and how many came before. */
export function recentActivity(items: readonly FrameItem[], mark: number, wake: readonly string[]) {
  const recent = items.filter(item => (item.seq ?? Infinity) > mark && !wake.includes(item.id));
  return { recent, older: items.filter(item => (item.seq ?? Infinity) <= mark).length };
}
/** A page of a long text from a character on, by whole characters; the results say how many it left. */
export function page(text: string, from: number): string {
  return Array.from(text).slice(Math.max(0, from)).join("");
}
/** Activity from before the mark, newest first, one line each, as the read act returns it. */
export const olderActivity = (items: readonly FrameItem[], mark: number, show: (item: FrameItem) => string) =>
  items
    .filter(item => (item.seq ?? Infinity) <= mark)
    .reverse()
    .map(show)
    .join("\n");
