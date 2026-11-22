// The line that wakes a consciousness for a cut says how many turns of that journey were cut: a fact, not a limit.
import { expect, it } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { journeyStep, type Journeys } from "../../house/minds/journey-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { emptyDevices } from "../../house/devices/device-state.ts";
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
it("counts every cut since the journey opened up to the waking one, and no restart: no failure of the mind", () => {
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
  const [first] = wakeWords(history, { journeys, devices: emptyDevices }, ["e3"], "es");
  expect(first).toContain("límite de doce llamadas");
  expect(first).toContain("contando este: 1.");
  const [last] = wakeWords(history, { journeys, devices: emptyDevices }, ["e9"], "es");
  expect(last).toContain("La llamada quedó incierta.");
  expect(last).toContain("contando este: 2.");
});
it("says every waking fact itself: a message, an act and what it did, a closing, an opening, a wait due", () => {
  const long = "f".repeat(64);
  const said = effect(
    "tool-entry",
    { tool: "talk", target: "talk/thread", author: "ana", text: "Dicho · Mate" },
    "ana",
  );
  const history = at([
    effect("act", { object: "talk/thread", option: "thread/say", input: { text: "Mate" } }, "ana"),
    { ...said, cause: ["e1"] },
    opened,
    effect("journey-waiting", { what: "La respuesta de ana", until: 5 }, actor, [], "j1"),
    effect("journey-closed", { outcome: "done", summary: "Anoté el mate", references: [] }, actor, [], "j1"),
  ]);
  const journeys = journeysOf(history);
  const message = (event: Event) =>
    event.id === "e2" ? { text: "ana en talk/thread: Mate", to: [actor], by: "ana" } : undefined;
  const lines = wakeWords(
    history,
    { journeys, devices: emptyDevices, message },
    ["e2", "e1", "e3", "e4", "e5", long],
    "es",
  );
  expect(lines).toEqual([
    "ana en talk/thread: Mate",
    "ana hizo thread/say en talk/thread: Dicho · Mate",
    "Tu consciencia abrió este journey; su objetivo está en Contexto.",
    "Llegó la hora que elegiste al esperar: La respuesta de ana",
    "mind:notes terminó el journey «Anotar»: Anoté el mate",
    long,
  ]);
});
