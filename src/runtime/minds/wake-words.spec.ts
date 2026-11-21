// The line that wakes a consciousness for a cut says how many turns of that journey were cut: a fact, not a limit.
import { expect, it } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { journeyStep, type Journeys } from "../../house/minds/journey-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { wakeWords } from "./wake-words.ts";
const actor = "mind:notes";
const at = (emissions: readonly HouseEmission[]): Event[] =>
  emissions.map((emission, index) => ({ ...emission, id: `e${index + 1}`, seq: index + 1, at: 0 }));
const opened = effect("journey-opened", { goal: "Anotar", kit: [] }, actor, [], "j1");
const turn = (id: string) => effect("mind-turn-opened", { turn: id, wake: [] }, actor, [], "j1");
const closed = (id: string, data: Partial<HouseEmission<"mind-turn-closed">["data"]>) =>
  effect("mind-turn-closed", { turn: id, outcome: "failed", calls: 12, applied: [], ...data }, actor, [], "j1");
const journeysOf = (history: readonly Event[]): Journeys =>
  history.reduce<Journeys>((state, event) => (event.layer === "house" ? journeyStep(state, event) : state), new Map());
it("counts every closure with a reason since the journey opened, restarts included, up to the waking one", () => {
  const history = at([
    opened,
    turn("t1"),
    closed("t1", { reason: "call-limit" }),
    turn("t2"),
    closed("t2", { outcome: "interrupted", reason: "interrupted" }),
    turn("t3"),
    closed("t3", {}),
    turn("t4"),
    closed("t4", { outcome: "interrupted", reason: "uncertain" }),
  ]);
  const journeys = journeysOf(history);
  const [first] = wakeWords(history, journeys, ["e3"], "es") ?? [];
  expect(first).toContain("límite de doce llamadas");
  expect(first).toContain("contando este: 1.");
  const [last] = wakeWords(history, journeys, ["e9"], "es") ?? [];
  expect(last).toContain("La llamada quedó incierta.");
  expect(last).toContain("contando este: 3.");
});
