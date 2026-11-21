// Says in words why a mind woke when the waking fact is about its journeys; any other fact keeps its id.
import type { Language } from "../../fields/languages.ts";
import type { Journeys } from "../../house/minds/journey-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { journeyCut, journeyWoke } from "../../texts/journey.texts.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
/** How many turns of this journey closed with a reason up to this one, restarts included: a fact, not a limit. */
const cutsOf = (history: readonly Event[], event: Event) =>
  history.filter(
    e =>
      e.seq <= event.seq &&
      e.layer === "house" &&
      e.kind === "mind-turn-closed" &&
      e.process === event.process &&
      e.data.reason !== undefined,
  ).length;
function describe(
  event: Event | undefined,
  journeys: Journeys,
  language: Language,
  history: readonly Event[],
): string | undefined {
  if (event?.layer !== "house") return undefined;
  if (event.kind === "journey-resumed") return journeyWoke.text(language, { cause: "resume", note: event.data.note });
  if (event.kind !== "mind-turn-closed" || !event.process || !event.data.reason) return undefined;
  if (event.data.reason === "interrupted") return journeyWoke.text(language, { cause: "restart", note: "" });
  const goal = journeys.get(event.process)?.goal;
  const reason = turnNotice.text(language, { reason: event.data.reason });
  return goal === undefined ? undefined : journeyCut.text(language, { goal, reason, cuts: cutsOf(history, event) });
}
/** One line per waking fact, or nothing when no fact has words, so every other frame stays as it was. */
export function wakeWords(
  history: readonly Event[],
  journeys: Journeys,
  wake: readonly string[],
  language: Language,
): readonly string[] | undefined {
  const events = new Map(history.flatMap(event => (wake.includes(event.id) ? [[event.id, event] as const] : [])));
  const lines = wake.map(id => describe(events.get(id), journeys, language, history));
  return lines.some(line => line !== undefined) ? lines.map((line, index) => line ?? wake[index] ?? "") : undefined;
}
