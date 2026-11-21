// Says in words why a mind woke when the waking fact is about its journeys; any other fact keeps its id.
import type { Language } from "../../fields/languages.ts";
import type { Journeys } from "../../house/minds/journey-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { journeyCut, journeyWoke } from "../../texts/journey.texts.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
function describe(event: Event | undefined, journeys: Journeys, language: Language): string | undefined {
  if (event?.layer !== "house") return undefined;
  if (event.kind === "journey-resumed") return journeyWoke.text(language, { cause: "resume", note: event.data.note });
  if (event.kind !== "mind-turn-closed" || !event.process || !event.data.reason) return undefined;
  if (event.data.reason === "interrupted") return journeyWoke.text(language, { cause: "restart", note: "" });
  const goal = journeys.get(event.process)?.goal;
  const reason = turnNotice.text(language, { reason: event.data.reason });
  return goal === undefined ? undefined : journeyCut.text(language, { goal, reason });
}
/** One line per waking fact, or nothing when no fact has words, so every other frame stays as it was. */
export function wakeWords(
  history: readonly Event[],
  journeys: Journeys,
  wake: readonly string[],
  language: Language,
): readonly string[] | undefined {
  const events = new Map(history.flatMap(event => (wake.includes(event.id) ? [[event.id, event] as const] : [])));
  const lines = wake.map(id => describe(events.get(id), journeys, language));
  return lines.some(line => line !== undefined) ? lines.map((line, index) => line ?? wake[index] ?? "") : undefined;
}
